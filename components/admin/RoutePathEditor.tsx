"use client";

import { ChevronLeft, ChevronRight, Download, MapPinned, PencilLine, Plus, Redo2, RotateCcw, Route, Save, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { readEditorDraft, removeEditorDraft, sameEditorRoute, saveEditorDraft, type EditorDraft } from "@/lib/admin-route-draft";
import { haversineMeters } from "@/lib/geo";
import { publishRouteRevision } from "@/app/admin/actions";
import AdminRouteMap from "@/components/admin/AdminRouteMap";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import {
  INITIAL_ROUTE_ACTION_STATE,
  MAX_ROUTE_POINTS,
  insertRoutePoint,
  joinRouteSegment,
  parseRouteCoordinate,
  parseRoutePath,
  type RouteOperationalStatus,
  type RouteSegmentDraft,
} from "@/lib/admin-route";
import type { Coordinates } from "@/lib/types";

type RouteSnapshot = {
  id: number;
  name: string;
  originalName: string;
  color: string;
  corridorWidthM: number;
  verified: boolean;
  operationalStatus: RouteOperationalStatus;
  dataVersion: number;
  path: unknown;
};

type Props = {
  route: RouteSnapshot;
  directionLabel: string;
  relatedDirections: { id: number; label: string; href: string; path: Coordinates[] | null }[];
  linkedReport: { id: string; proposedPath: unknown } | null;
};

type MapMode = "select" | "move" | "insert-before" | "insert-after";

const fieldClass = "admin-field mt-1 w-full";
const buttonClass = "admin-button inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-bold";

export default function RoutePathEditor({ route, directionLabel, relatedDirections, linkedReport }: Props) {
  const [state, action, pending] = useActionState(publishRouteRevision, INITIAL_ROUTE_ACTION_STATE);
  const original = JSON.stringify(route.path);
  const [path, setPath] = useState(original);
  const [undo, setUndo] = useState<string[]>([]);
  const [redo, setRedo] = useState<string[]>([]);
  const [recovery, setRecovery] = useState<EditorDraft | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftNotice, setDraftNotice] = useState("");
  const [pointNumber, setPointNumber] = useState("");
  const [color, setColor] = useState(route.color);
  const [name, setName] = useState(route.name);
  const [direction, setDirection] = useState(route.originalName);
  const [operationalStatus, setOperationalStatus] = useState<string>(route.operationalStatus);
  const [width, setWidth] = useState(String(route.corridorWidthM));
  const [summary, setSummary] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const [showRelated, setShowRelated] = useState(false);
  const [mode, setMode] = useState<MapMode>("select");
  const [segment, setSegment] = useState<RouteSegmentDraft | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pointError, setPointError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const published = useMemo(() => parseRoutePath(original), [original]);
  const draft = useMemo(() => parseRoutePath(path), [path]);
  const joinedDraft = useMemo(() => (
    draft && segment?.start != null && segment.end != null
      ? joinRouteSegment(draft, segment.start, segment.end, segment.points)
      : null
  ), [draft, segment]);
  const relatedPaths = useMemo(() => relatedDirections.flatMap(({ path }) => path ? [path] : []), [relatedDirections]);
  const otherDirectionsLabel = relatedDirections.length === 1 ? relatedDirections[0].label : "otros sentidos";
  const proposedPath = useMemo(() => parseRoutePath(JSON.stringify(linkedReport?.proposedPath ?? null)), [linkedReport?.proposedPath]);
  const canAdd = !!draft && draft.length < MAX_ROUTE_POINTS;
  const drawingSegment = segment?.start != null && segment.end != null;
  const inserting = mode === "insert-before" || mode === "insert-after";
  const insertionSegment = inserting && selected !== null
    ? selected - (mode === "insert-before" ? 1 : 0)
    : null;
  const pathChanged = !!draft && JSON.stringify(draft) !== JSON.stringify(published);
  const hasUnsavedChanges = path !== original || name !== route.name || direction !== route.originalName
    || operationalStatus !== route.operationalStatus || width !== String(route.corridorWidthM)
    || color !== route.color || summary !== "" || !!segment;
  const reportId = linkedReport?.id ?? null;
  const editorSnapshot = useMemo(() => ({ routeId: route.id, baseVersion: route.dataVersion, reportId,
    path, name, direction, color, width, operationalStatus, summary, segment }),
  [route.id, route.dataVersion, reportId, path, name, direction, color, width, operationalStatus, summary, segment]);
  const originalSnapshot = useMemo(() => ({ path: original, name: route.name, direction: route.originalName,
    color: route.color, width: String(route.corridorWidthM), operationalStatus: route.operationalStatus }),
    [original, route.name, route.originalName, route.color, route.corridorWidthM, route.operationalStatus]);
  const distanceM = useMemo(() => draft?.reduce((total, point, i) => total + (i ? haversineMeters(draft[i - 1], point) : 0), 0) ?? 0, [draft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readEditorDraft(route.id, reportId);
      if (saved?.submitted && saved.baseVersion < route.dataVersion && sameEditorRoute(saved, originalSnapshot)) {
        try { removeEditorDraft(route.id, reportId); } catch { /* Keep editing if storage is unavailable. */ }
      } else if (saved) setRecovery(saved);
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [route.id, route.dataVersion, reportId, originalSnapshot]);

  useEffect(() => {
    if (!draftReady || recovery || pending) return;
    const timer = window.setTimeout(() => {
      try {
        if (hasUnsavedChanges) {
          saveEditorDraft(editorSnapshot);
          setDraftNotice("Borrador guardado en este dispositivo durante 7 días. Todavía no está publicado.");
        } else {
          removeEditorDraft(route.id, reportId);
          setDraftNotice("");
        }
      } catch { setDraftNotice("No pudimos guardar el borrador en este dispositivo. Mantén la página abierta hasta publicar."); }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [draftReady, recovery, pending, hasUnsavedChanges, editorSnapshot, route.id, reportId]);

  const latestDraft = useRef({ editorSnapshot, save: false });
  useEffect(() => { latestDraft.current = { editorSnapshot, save: draftReady && !recovery && !pending && hasUnsavedChanges }; },
    [editorSnapshot, draftReady, recovery, pending, hasUnsavedChanges]);
  useEffect(() => () => {
    if (latestDraft.current.save) {
      try { saveEditorDraft(latestDraft.current.editorSnapshot); } catch { /* The visible save notice already explains storage errors. */ }
    }
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges || pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (latestDraft.current.save) { try { saveEditorDraft(latestDraft.current.editorSnapshot); } catch { /* The browser warning still protects unsaved work. */ } }
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges, pending]);

  function restoreDraft() {
    if (!recovery || recovery.baseVersion !== route.dataVersion) return;
    setPath(recovery.path); setName(recovery.name); setDirection(recovery.direction); setColor(recovery.color);
    setWidth(recovery.width); setOperationalStatus(recovery.operationalStatus); setSummary(recovery.summary);
    setSegment(recovery.segment); setMapOpen(true); setUndo([]); setRedo([]); setSelected(null); setMode("select");
    setRecovery(null); setConfirming(false); setDraftNotice("Borrador recuperado. Revisa el recorrido antes de publicar.");
  }

  function travelHistory(forward: boolean) {
    const source = forward ? redo : undo;
    if (!source.length || pending || segment) return;
    const next = source[source.length - 1];
    if (forward) { setUndo((items) => [...items.slice(-19), path]); setRedo(source.slice(0, -1)); }
    else { setRedo((items) => [...items.slice(-19), path]); setUndo(source.slice(0, -1)); }
    setPath(next); clearSelection(); setConfirming(false);
  }

  function startSegment() {
    if (!draft || pending) return;
    setMapOpen(true); setSegment({ start: null, end: null, points: [] });
    setMode("select"); setPointError(""); setConfirming(false);
  }

  function clearSelection() {
    setMode("select");
    setSegment(null);
    setSelected(null);
    setPointError("");
  }

  function setDraft(next: Coordinates[], nextSelection: number | null = null, nextMode: MapMode = "select") {
    const serialized = JSON.stringify(next);
    if (serialized !== path) {
      setUndo((history) => [...history.slice(-19), path]);
      setRedo([]);
    }
    setPath(serialized);
    setMode(nextMode);
    setSegment(null);
    setSelected(nextSelection);
    setPointError("");
    setConfirming(false);
  }

  function chooseConnection(index: number) {
    if (!segment || !draft?.[index]) return;
    if (segment.start === index) {
      setPointError("Elige otro punto del recorrido para la conexión B.");
      return;
    }
    setSegment(segment.start === null
      ? { start: index, end: null, points: [] }
      : { ...segment, end: index });
    setSelected(index);
    setPointError("");
  }

  function addSegmentPoint(point: Coordinates) {
    if (!draft || segment?.start == null || segment.end === null) return;
    const preservedCount = draft.length - Math.abs(segment.start - segment.end) + 1;
    if (preservedCount + segment.points.length >= MAX_ROUTE_POINTS) {
      setPointError("El recorrido alcanzó el límite de puntos.");
      return;
    }
    if (!parseRouteCoordinate(point)) {
      setPointError("El punto debe quedar dentro de la zona de Uruapan.");
      return;
    }
    const last = segment.points.at(-1) ?? draft[segment.start];
    const end = draft[segment.end];
    if ([last, end].some(([lng, lat]) => lng === point[0] && lat === point[1])) {
      setPointError("Marca un punto intermedio distinto de los puntos de conexión.");
      return;
    }
    setSegment({ ...segment, points: [...segment.points, point] });
    setPointError("");
  }

  function pickPoint(point: Coordinates, index: number | null) {
    if (pending || !draft) return;
    if (segment) {
      if (drawingSegment) addSegmentPoint(point);
      else if (index !== null) chooseConnection(index);
      return;
    }
    if (mode === "select") {
      setSelected(index);
      setPointError("");
      return;
    }
    if (selected === null || !draft[selected]) return;
    if (!parseRouteCoordinate(point)) {
      setPointError("El punto debe quedar dentro de la zona de Uruapan.");
      return;
    }
    if (mode === "move") {
      const next = [...draft];
      next[selected] = point;
      setDraft(next, selected);
    } else if (canAdd) {
      const inserted = insertRoutePoint(draft, selected, mode === "insert-before" ? "before" : "after", point);
      setDraft(inserted.path, inserted.index, inserted.path.length < MAX_ROUTE_POINTS ? "insert-after" : "select");
    }
  }

  function toggleMode(next: MapMode) {
    setMode(mode === next ? "select" : next);
    setPointError("");
  }

  function selectPoint(index: number) {
    setMode("select");
    setSelected(index);
    setPointError("");
  }

  const mapHint = selected === null ? "Toca un punto del borrador o usa la flecha para empezar por el primero."
    : mode === "move" ? `Toca la nueva ubicación del punto ${selected + 1}. Mantendrá su lugar en el recorrido.`
      : mode === "insert-before" ? `Toca dónde agregar un punto antes del ${selected + 1}.`
        : mode === "insert-after" ? `Toca dónde agregar un punto después del ${selected + 1}. Puedes seguir agregando en orden.`
          : "Elige qué hacer con el punto seleccionado.";

  return (
    <form action={action} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_370px]"
      onSubmit={(event) => {
        if (segment) event.preventDefault();
        else { try { saveEditorDraft({ ...editorSnapshot, submitted: true }); } catch { /* Publication can continue without local storage. */ } }
      }}
      onKeyDown={(event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
        if ((event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
        event.preventDefault(); travelHistory(event.shiftKey);
      }}
      onChange={() => setConfirming(false)}
      onInvalid={(event) => {
        const details = (event.target as HTMLElement).closest("details");
        if (details) details.open = true;
      }}>
      <input type="hidden" name="routeId" value={route.id} />
      <input type="hidden" name="expectedVersion" value={route.dataVersion} />
      <input type="hidden" name="path" value={path} />
      {linkedReport && <input type="hidden" name="reportId" value={linkedReport.id} />}

      {recovery && <section className="admin-draft-recovery xl:col-span-2" aria-label="Borrador recuperable">
        <div><h3 className="font-bold">Tienes un borrador en este dispositivo</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--admin-muted)]">Guardado el {new Date(recovery.savedAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}. {recovery.baseVersion === route.dataVersion
            ? "Puedes continuar donde te quedaste o descartarlo antes de empezar otro cambio."
            : `Se hizo sobre la versión ${recovery.baseVersion}; la ruta ya está en la versión ${route.dataVersion}. Descárgalo para comparar antes de editar la versión actual.`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {recovery.baseVersion === route.dataVersion && <button type="button" onClick={restoreDraft} className={`${buttonClass} admin-primary`}>Recuperar borrador</button>}
          <button type="button" className={buttonClass} onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(recovery, null, 2)], { type: "application/json" }));
            const link = document.createElement("a"); link.href = url; link.download = `urugo-ruta-${route.id}-borrador.json`;
            link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
          }}><Download className="h-4 w-4" aria-hidden="true" /> Descargar borrador</button>
          <button type="button" className={buttonClass} onClick={() => {
            try { removeEditorDraft(route.id, reportId); setRecovery(null); }
            catch { setDraftNotice("No pudimos quitar el borrador. Comprueba el espacio disponible."); }
          }}>Descartar borrador guardado</button>
        </div>
      </section>}

      <div className="admin-editor-status xl:col-span-2" role="status">
        <span className={hasUnsavedChanges ? "admin-badge admin-badge-warning" : "admin-badge admin-badge-success"}>{hasUnsavedChanges ? "Cambios sin publicar" : `Versión ${route.dataVersion} publicada`}</span>
        <span>{draftNotice || "El borrador se guarda automáticamente en este dispositivo mientras editas."}</span>
      </div>

      <section className="admin-card min-w-0" aria-label="Editor del recorrido">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-base font-bold">Recorrido</h3>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{draft ? `${draft.length} puntos · ${pathChanged ? "Borrador modificado" : "Trazado actual"}` : "Coordenadas inválidas"}</p>
            {draft && <p className="mt-1 text-xs text-[var(--admin-muted)]">{(distanceM / 1000).toFixed(2)} km de trazado · {directionLabel}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending || !!segment || !draft} onClick={startSegment} className={`${buttonClass} admin-primary`}><Route className="h-4 w-4" aria-hidden="true" /> Cambiar un tramo</button>
          <button type="button" disabled={!!segment || pending} onClick={() => { setMapOpen(!mapOpen); clearSelection(); }}
            aria-expanded={mapOpen} className={buttonClass}>
            <MapPinned className="h-4 w-4" aria-hidden="true" /> {mapOpen ? "Cerrar mapa" : "Editar en el mapa"}
          </button>
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--admin-line)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sentido del recorrido">
            <span aria-current="page" className="admin-button admin-primary inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold">
              Editando {directionLabel} · #{route.id}
            </span>
            {relatedDirections.map((other) => (
              <Link key={other.id} href={other.href} className={buttonClass} onNavigate={(event) => {
                if (pending || (hasUnsavedChanges && !window.confirm("Hay cambios sin publicar en este sentido. ¿Quieres descartarlos y abrir el otro sentido?"))) {
                  event.preventDefault();
                }
              }}>Editar {other.label} · #{other.id}</Link>
            ))}
          </div>
          {relatedDirections.length > 0 && <p className="text-xs text-[var(--admin-muted)]">Al publicar, solo se actualiza el sentido que estás editando.</p>}
        </div>

        {mapOpen ? (
          <>
            <div className="admin-map-toolbar">
              <div><p className="text-xs font-bold text-[var(--brand-lime)]">{segment ? segment.start === null ? "1 / 3 · Elige dónde empieza" : segment.end === null ? "2 / 3 · Elige dónde termina" : "3 / 3 · Traza y une el cambio" : "Edita el recorrido en orden"}</p>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">{segment ? "Solo cambia el tramo entre A y B. El resto del recorrido se conserva." : "Elige un punto para moverlo, quitarlo o agregar otros a su lado."}</p></div>
              <div className="flex gap-2">
                {segment && <>
                  {drawingSegment && <button type="button" disabled={!joinedDraft || pending} className={`${buttonClass} admin-primary`} onClick={() => { if (joinedDraft) setDraft(joinedDraft); }}>Unir al recorrido</button>}
                  <button type="button" disabled={pending} className={buttonClass} onClick={clearSelection}>Cancelar tramo</button>
                </>}
                <button type="button" disabled={!undo.length || pending || !!segment} onClick={() => travelHistory(false)} className={buttonClass} title="Deshacer · Ctrl+Z"><Undo2 className="h-4 w-4" aria-hidden="true" /> Deshacer</button>
                <button type="button" disabled={!redo.length || pending || !!segment} onClick={() => travelHistory(true)} className={buttonClass} title="Rehacer · Ctrl+Mayús+Z"><Redo2 className="h-4 w-4" aria-hidden="true" /> Rehacer</button>
              </div>
            </div>
            <div className="admin-map-workspace">
            {(published || relatedPaths.length > 0) && (
              <details className="admin-map-layers border-t border-[var(--admin-line)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">Capas de referencia</summary>
                <div className="mt-2 flex flex-wrap gap-2">
                  {published && <button type="button" aria-pressed={showPublished} onClick={() => setShowPublished(!showPublished)}
                    className={buttonClass}>Comparar con publicado</button>}
                  {relatedPaths.length > 0 && <button type="button" aria-pressed={showRelated} onClick={() => setShowRelated(!showRelated)}
                    className={buttonClass}>Mostrar {otherDirectionsLabel}</button>}
                </div>
              </details>
            )}
            <AdminRouteMap
              published={published ?? []} draft={draft ?? []} relatedPaths={relatedPaths}
              directionLabel={directionLabel} showPublished={showPublished} showRelated={showRelated}
              selected={selected} insertionSegment={insertionSegment} segment={segment}
              placing={mode !== "select" || drawingSegment} onPick={pickPoint}
            />
            <div className="admin-map-tools space-y-3 border-t border-[var(--admin-line)] p-4">
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-amber-200">Dorado · borrador de {directionLabel}</span>
                {showPublished && <span className="text-blue-300">Azul discontinuo · publicado de {directionLabel}</span>}
                {showRelated && <span className="text-teal-300">Verde discontinuo · {otherDirectionsLabel}</span>}
                {insertionSegment !== null && draft?.[insertionSegment] && draft[insertionSegment + 1] && <span className="text-violet-300">Morado · tramo de inserción</span>}
                {segment?.start != null && <span className="text-lime-200">Verde claro · conexión A</span>}
                {drawingSegment && <span className="text-orange-200">Naranja · conexión B</span>}
                {!!segment?.points.length && <span className="text-violet-300">Morado · tramo nuevo</span>}
              </div>
              {draft && !segment && (
                <button type="button" disabled={pending} className={buttonClass} onClick={startSegment}><Route className="h-4 w-4" aria-hidden="true" /> Reemplazar tramo</button>
              )}
              {segment && (
                <div className="space-y-2 rounded-xl border border-violet-300/40 bg-violet-300/10 p-3">
                  <p className="text-xs font-bold text-violet-200">{drawingSegment ? "Paso 3 de 3 · Dibuja el tramo" : segment.start === null ? "Paso 1 de 3 · Conexión A" : "Paso 2 de 3 · Conexión B"}</p>
                  <p className="text-sm text-[var(--admin-muted)]" role="status">
                    {drawingSegment
                      ? `Marca los puntos intermedios en orden. El tramo se conectará entre A (punto ${segment.start! + 1}) y B (punto ${segment.end! + 1}).`
                      : segment.start === null ? "Toca un punto del recorrido para marcar dónde comienza el cambio."
                        : `A está en el punto ${segment.start + 1}. Toca otro punto del recorrido para marcar dónde termina el cambio.`}
                  </p>
                  {drawingSegment && <p className="text-xs text-violet-200">{Math.abs(segment.start! - segment.end!) === 2 ? "Se reemplaza 1 punto intermedio" : `Se reemplazan ${Math.abs(segment.start! - segment.end!) - 1} puntos intermedios`} por {segment.points.length} nuevos. Las conexiones A y B se conservan.</p>}
                  <div className="flex flex-wrap gap-2">
                    {drawingSegment ? (
                      <>
                        <button type="button" disabled={!segment.points.length} className={buttonClass}
                          onClick={() => { setSegment({ ...segment, points: segment.points.slice(0, -1) }); setPointError(""); }}>Quitar último punto nuevo</button>
                      </>
                    ) : selected !== null && (
                      <button type="button" disabled={selected === segment.start} className={buttonClass}
                        onClick={() => chooseConnection(selected)}>Usar punto {selected + 1} como {segment.start === null ? "A" : "B"}</button>
                    )}
                  </div>
                </div>
              )}
              {draft && !drawingSegment && (
                <div role="group" aria-label="Orden de los puntos" className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={pending || selected === null || selected === 0}
                    onClick={() => { if (selected !== null) selectPoint(selected - 1); }}
                    className={`${buttonClass} w-11 px-0`} aria-label="Seleccionar punto anterior"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
                  <span aria-live="polite" aria-atomic="true" className="text-sm font-bold text-[var(--brand-lime)]">
                    {selected === null ? "Sin punto seleccionado" : `Punto ${selected + 1} de ${draft.length}`}
                  </span>
                  <button type="button" disabled={pending || selected === draft.length - 1} onClick={() => selectPoint((selected ?? -1) + 1)}
                    className={`${buttonClass} w-11 px-0`} aria-label={selected === null ? "Seleccionar primer punto" : "Seleccionar punto siguiente"}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              )}
              {draft && !drawingSegment && <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-semibold text-[var(--admin-muted)]">Ir al punto
                  <input type="text" inputMode="numeric" value={pointNumber} onChange={(event) => setPointNumber(event.target.value.slice(0, 6))} className="admin-field ml-2 w-24" aria-label="Número de punto" />
                </label>
                <button type="button" className={buttonClass} disabled={pending || !Number.isInteger(Number(pointNumber)) || Number(pointNumber) < 1 || Number(pointNumber) > draft.length} onClick={() => selectPoint(Number(pointNumber) - 1)}>Seleccionar punto</button>
              </div>}
              {!segment && <p className="text-sm text-[var(--admin-muted)]" role="status">{draft ? mapHint : "Corrige las coordenadas para seguir editando en el mapa."}</p>}
              {selected !== null && draft && !segment && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={pending || !canAdd} aria-pressed={mode === "insert-after"} onClick={() => toggleMode("insert-after")}
                    className={buttonClass}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar después</button>
                  <button type="button" disabled={pending || !canAdd} aria-pressed={mode === "insert-before"} onClick={() => toggleMode("insert-before")}
                    className={buttonClass}>Agregar antes</button>
                  <button type="button" disabled={pending} aria-pressed={mode === "move"} onClick={() => toggleMode("move")}
                    className={buttonClass}><PencilLine className="h-4 w-4" aria-hidden="true" /> Mover punto</button>
                  <button type="button" disabled={pending || draft.length <= 2}
                    onClick={() => setDraft(draft.filter((_, index) => index !== selected), Math.min(selected, draft.length - 2))}
                    className={buttonClass}><Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar punto</button>
                  {mode !== "select" && (
                    <button type="button" onClick={() => toggleMode("select")} className={buttonClass}>Terminar edición de puntos</button>
                  )}
                </div>
              )}
              {pointError && <p role="alert" className="text-xs text-amber-200">{pointError}</p>}
            </div>
            </div>
          </>
        ) : (
          <div className="admin-route-preview grid min-h-48 place-items-center border-y border-[var(--admin-line)] px-4" role="img" aria-label="Vista previa del recorrido">
            {draft ? <RoutePreviewSVG paths={[draft]} color={color} width={640} height={220} strokeWidth={5} className="h-auto max-w-full" />
              : <p className="text-sm text-amber-200">Corrige las coordenadas o recupera el trazado publicado.</p>}
          </div>
        )}

        {!segment && <><div className="flex flex-wrap gap-2 px-4 py-3">
          {proposedPath && (
            <button type="button" disabled={pending} onClick={() => setDraft(proposedPath)} className={buttonClass}>Cargar propuesta como borrador</button>
          )}
          {!mapOpen && <><button type="button" disabled={!undo.length || pending} onClick={() => {
            travelHistory(false);
          }} className={buttonClass}><Undo2 className="h-4 w-4" aria-hidden="true" /> Deshacer</button>
          <button type="button" disabled={!redo.length || pending} onClick={() => travelHistory(true)} className={buttonClass}><Redo2 className="h-4 w-4" aria-hidden="true" /> Rehacer</button>
          </>}
          <button type="button" disabled={path === original || !published || pending} onClick={() => { if (published) setDraft(published); }} className={buttonClass}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recuperar trazado
          </button>
        </div>
        {proposedPath && <p className="px-4 pb-3 text-xs text-[var(--admin-muted)]">La propuesta sustituye todo el trazado. Para corregir solo una parte, usa «Cambiar un tramo».</p>}
        <details className="border-t border-[var(--admin-line)] p-4">
          <summary className="cursor-pointer text-sm font-bold">Coordenadas avanzadas</summary>
          <label className="mt-3 block text-xs font-bold text-[var(--admin-muted)]">
            Coordenadas del recorrido
            <textarea value={path} onChange={(event) => { setPath(event.target.value); clearSelection(); }} rows={8} spellCheck={false}
              className="admin-field mt-1 w-full resize-y font-mono text-xs leading-5" />
          </label>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">Puedes pegar una lista de coordenadas o un LineString de GeoJSON. La longitud va primero.</p>
        </details></>}
      </section>

      <section className="admin-card min-w-0 space-y-4 p-4 xl:sticky xl:top-5" aria-label="Datos y publicación">
        <h3 className="text-base font-bold">Datos de la ruta</h3>
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Nombre público
          <input name="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className={fieldClass} />
        </label>
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Estado operativo
          <select aria-label="Estado operativo" name="operationalStatus" value={operationalStatus} onChange={(event) => setOperationalStatus(event.target.value)} className={fieldClass}>
            <option value="active">Activa</option>
            <option value="under_review">En revisión</option>
            <option value="inactive">Inactiva</option>
            <option value="historical">Histórica</option>
          </select>
        </label>
        <details className="border-y border-[var(--admin-line)] py-3">
          <summary className="cursor-pointer text-sm font-bold">Dirección, color y cobertura</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-bold text-[var(--admin-muted)]">
              Nombre de dirección
              <input name="originalName" value={direction} onChange={(event) => setDirection(event.target.value)} required minLength={2} maxLength={160} className={fieldClass} />
            </label>
            <label className="block text-xs font-bold text-[var(--admin-muted)]">
              Ancho de búsqueda (metros)
              <input name="corridorWidthM" type="number" min={10} max={1000} step={1} value={width} onChange={(event) => setWidth(event.target.value)} required className={fieldClass} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--admin-muted)]">
              Color de la ruta
              <input name="color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 w-12 cursor-pointer" />
              <span className="font-mono uppercase">{color}</span>
            </label>
          </div>
        </details>
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Resumen del cambio
          <textarea name="changeSummary" value={summary} onChange={(event) => setSummary(event.target.value)} required minLength={10} maxLength={1000} rows={3} placeholder="Qué cambió y cómo lo comprobaste" className="admin-field mt-1 w-full resize-y" />
        </label>
        {route.verified && pathChanged && <p className="text-xs text-amber-200">El nuevo recorrido quedará pendiente de verificación de campo.</p>}
        {state.status === "error" && <p role="alert" className="rounded-lg bg-red-400/10 p-3 text-sm text-[#f2b7af]">{state.message}</p>}
        {segment && <p className="text-xs text-[var(--admin-muted)]">Une o cancela el tramo para continuar con la publicación.</p>}
        <div className="space-y-2 border-t border-[var(--admin-line)] pt-4">
          {confirming ? (
            <>
              <p className="text-sm text-[var(--admin-muted)]">La versión {route.dataVersion + 1} se publicará para {directionLabel} (#{route.id}). Las versiones guardadas se pueden restaurar desde el historial.</p>
              <dl className="admin-publication-review"><div><dt>Recorrido</dt><dd>{pathChanged ? "Modificado" : "Sin cambios"} · {draft?.length} puntos</dd></div><div><dt>Nombre</dt><dd>{name}</dd></div><div><dt>Sentido</dt><dd>{direction}</dd></div><div><dt>Estado</dt><dd>{({ active: "Activa", under_review: "En revisión", inactive: "Inactiva", historical: "Histórica" } as Record<string, string>)[operationalStatus]}</dd></div></dl>
              <button type="submit" disabled={pending || !draft} className="admin-button admin-primary min-h-11 w-full px-3 text-sm font-bold">{pending ? "Publicando…" : `Confirmar publicación de versión ${route.dataVersion + 1}`}</button>
              <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={`${buttonClass} w-full`}>Volver a editar</button>
            </>
          ) : (
            <button type="button" disabled={pending || !draft || !!segment}
              onClick={(event) => { if (event.currentTarget.form?.reportValidity()) setConfirming(true); }}
              className="admin-button admin-primary inline-flex min-h-11 w-full items-center justify-center gap-2 px-3 text-sm font-bold">
              <Save className="h-4 w-4" aria-hidden="true" /> Revisar publicación
            </button>
          )}
        </div>
      </section>
    </form>
  );
}

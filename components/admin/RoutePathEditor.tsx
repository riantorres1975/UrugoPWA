"use client";

import { ChevronLeft, ChevronRight, MapPinned, PencilLine, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { publishRouteRevision } from "@/app/admin/actions";
import AdminRouteMap from "@/components/admin/AdminRouteMap";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import {
  INITIAL_ROUTE_ACTION_STATE,
  MAX_ROUTE_POINTS,
  insertRoutePoint,
  parseRouteCoordinate,
  parseRoutePath,
  type RouteOperationalStatus,
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
  linkedReport: { id: string; proposedPath: unknown } | null;
};

type MapMode = "select" | "move" | "insert-before" | "insert-after";

const fieldClass = "admin-field mt-1 w-full";
const buttonClass = "admin-button inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-bold";

export default function RoutePathEditor({ route, linkedReport }: Props) {
  const [state, action, pending] = useActionState(publishRouteRevision, INITIAL_ROUTE_ACTION_STATE);
  const original = JSON.stringify(route.path);
  const [path, setPath] = useState(original);
  const [undo, setUndo] = useState<string[]>([]);
  const [color, setColor] = useState(route.color);
  const [name, setName] = useState(route.name);
  const [direction, setDirection] = useState(route.originalName);
  const [operationalStatus, setOperationalStatus] = useState<string>(route.operationalStatus);
  const [width, setWidth] = useState(String(route.corridorWidthM));
  const [summary, setSummary] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("select");
  const [selected, setSelected] = useState<number | null>(null);
  const [pointError, setPointError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const published = useMemo(() => parseRoutePath(original), [original]);
  const draft = useMemo(() => parseRoutePath(path), [path]);
  const proposedPath = useMemo(() => parseRoutePath(JSON.stringify(linkedReport?.proposedPath ?? null)), [linkedReport?.proposedPath]);
  const canAdd = !!draft && draft.length < MAX_ROUTE_POINTS;
  const inserting = mode === "insert-before" || mode === "insert-after";
  const insertionSegment = inserting && selected !== null
    ? selected - (mode === "insert-before" ? 1 : 0)
    : null;
  const pathChanged = !!draft && JSON.stringify(draft) !== JSON.stringify(published);

  function clearSelection() {
    setMode("select");
    setSelected(null);
    setPointError("");
  }

  function setDraft(next: Coordinates[], nextSelection: number | null = null, nextMode: MapMode = "select") {
    const serialized = JSON.stringify(next);
    if (serialized !== path) setUndo((history) => [...history.slice(-7), path]);
    setPath(serialized);
    setMode(nextMode);
    setSelected(nextSelection);
    setPointError("");
    setConfirming(false);
  }

  function pickPoint(point: Coordinates, index: number | null) {
    if (pending || !draft) return;
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
      onChange={() => setConfirming(false)}
      onInvalid={(event) => {
        const details = (event.target as HTMLElement).closest("details");
        if (details) details.open = true;
      }}>
      <input type="hidden" name="routeId" value={route.id} />
      <input type="hidden" name="expectedVersion" value={route.dataVersion} />
      <input type="hidden" name="path" value={path} />
      {linkedReport && <input type="hidden" name="reportId" value={linkedReport.id} />}

      <section className="admin-card min-w-0 overflow-hidden" aria-label="Editor del recorrido">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-base font-bold">Recorrido</h3>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{draft ? `${draft.length} puntos · ${pathChanged ? "Borrador modificado" : "Trazado actual"}` : "Coordenadas inválidas"}</p>
          </div>
          <button type="button" onClick={() => { setMapOpen(!mapOpen); clearSelection(); }}
            aria-expanded={mapOpen} className={buttonClass}>
            <MapPinned className="h-4 w-4" aria-hidden="true" /> {mapOpen ? "Cerrar mapa" : "Editar en el mapa"}
          </button>
        </div>

        {mapOpen ? (
          <>
            <AdminRouteMap published={published ?? []} draft={draft ?? []} selected={selected} insertionSegment={insertionSegment} placing={mode !== "select"} onPick={pickPoint} />
            <div className="space-y-3 border-t border-[var(--admin-line)] p-4">
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-blue-300">Azul · publicado</span>
                <span className="text-amber-200">Dorado · borrador</span>
                {insertionSegment !== null && draft?.[insertionSegment] && draft[insertionSegment + 1] && <span className="text-violet-300">Morado · tramo de inserción</span>}
              </div>
              {draft && (
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
              <p className="text-sm text-[var(--admin-muted)]" role="status">{draft ? mapHint : "Corrige las coordenadas para seguir editando en el mapa."}</p>
              {selected !== null && draft && (
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
          </>
        ) : (
          <div className="admin-route-preview grid min-h-48 place-items-center border-y border-[var(--admin-line)] px-4" role="img" aria-label="Vista previa del recorrido">
            {draft ? <RoutePreviewSVG paths={[draft]} color={color} width={640} height={220} strokeWidth={5} className="h-auto max-w-full" />
              : <p className="text-sm text-amber-200">Corrige las coordenadas o recupera el trazado publicado.</p>}
          </div>
        )}

        <div className="flex flex-wrap gap-2 px-4 py-3">
          {proposedPath && (
            <button type="button" disabled={pending} onClick={() => setDraft(proposedPath)} className={buttonClass}>Cargar propuesta como borrador</button>
          )}
          <button type="button" disabled={!undo.length || pending} onClick={() => {
            setPath(undo[undo.length - 1]);
            setUndo(undo.slice(0, -1));
            clearSelection();
            setConfirming(false);
          }} className={buttonClass}><Undo2 className="h-4 w-4" aria-hidden="true" /> Deshacer</button>
          <button type="button" disabled={path === original || !published || pending} onClick={() => { if (published) setDraft(published); }} className={buttonClass}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Recuperar trazado
          </button>
        </div>
        {proposedPath && <p className="px-4 pb-3 text-xs text-[var(--admin-muted)]">La propuesta sustituye el trazado del borrador. Comprueba que cubra el recorrido completo.</p>}
        <details className="border-t border-[var(--admin-line)] p-4">
          <summary className="cursor-pointer text-sm font-bold">Coordenadas avanzadas</summary>
          <label className="mt-3 block text-xs font-bold text-[var(--admin-muted)]">
            Coordenadas del recorrido
            <textarea value={path} onChange={(event) => { setPath(event.target.value); clearSelection(); }} rows={8} spellCheck={false}
              className="admin-field mt-1 w-full resize-y font-mono text-xs leading-5" />
          </label>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">Puedes pegar una lista de coordenadas o un LineString de GeoJSON. La longitud va primero.</p>
        </details>
      </section>

      <section className="admin-card min-w-0 space-y-4 p-4 xl:sticky xl:top-5" aria-label="Datos y publicación">
        <h3 className="text-base font-bold">Datos de la ruta</h3>
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Nombre público
          <input name="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className={fieldClass} />
        </label>
        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Estado operativo
          <select name="operationalStatus" value={operationalStatus} onChange={(event) => setOperationalStatus(event.target.value)} className={fieldClass}>
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
        <div className="space-y-2 border-t border-[var(--admin-line)] pt-4">
          {confirming ? (
            <>
              <p className="text-sm text-[var(--admin-muted)]">La versión {route.dataVersion + 1} actualizará la ruta del mapa público. Las versiones guardadas se pueden restaurar desde el historial.</p>
              <button type="submit" disabled={pending || !draft} className="admin-button admin-primary min-h-11 w-full px-3 text-sm font-bold">{pending ? "Publicando…" : `Confirmar publicación de versión ${route.dataVersion + 1}`}</button>
              <button type="button" disabled={pending} onClick={() => setConfirming(false)} className={`${buttonClass} w-full`}>Volver a editar</button>
            </>
          ) : (
            <button type="button" disabled={pending || !draft}
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

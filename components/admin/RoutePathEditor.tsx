"use client";

import { MapPinned, PencilLine, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { publishRouteRevision } from "@/app/admin/actions";
import AdminRouteMap from "@/components/admin/AdminRouteMap";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";
import {
  INITIAL_ROUTE_ACTION_STATE,
  MAX_ROUTE_POINTS,
  parseRouteCoordinate,
  parseRoutePath,
  type RouteOperationalStatus,
} from "@/lib/admin-route";
import { getClosestPointOnPath } from "@/lib/routeMatcher";
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

type MapMode = "select" | "move" | "insert";

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
  const validSelection = selected !== null && !!draft?.[selected];
  const pathChanged = !!draft && JSON.stringify(draft) !== JSON.stringify(published);

  function clearSelection() {
    setMode("select");
    setSelected(null);
    setPointError("");
  }

  function setDraft(next: Coordinates[], nextSelection: number | null = null) {
    const serialized = JSON.stringify(next);
    if (serialized !== path) setUndo((history) => [...history.slice(-7), path]);
    setPath(serialized);
    clearSelection();
    setSelected(nextSelection);
    setConfirming(false);
  }

  function pickPoint(point: Coordinates, index: number | null) {
    if (pending || !draft) return;
    if (mode === "select") {
      setSelected(index);
      return;
    }
    if (!parseRouteCoordinate(point)) {
      setPointError("El punto debe quedar dentro de la zona de Uruapan.");
      return;
    }
    if (mode === "move" && validSelection && selected !== null) {
      const next = [...draft];
      next[selected] = point;
      setDraft(next, selected);
    } else if (mode === "insert" && draft.length < MAX_ROUTE_POINTS) {
      const index = getClosestPointOnPath(point, draft).segmentIndex + 1;
      setDraft([...draft.slice(0, index), point, ...draft.slice(index)], index);
    }
  }

  const mapHint = mode === "move" ? "Toca la nueva posición del punto."
    : mode === "insert" ? "Toca cerca del tramo donde quieres insertar un punto."
      : selected !== null && draft ? `Punto ${selected + 1} de ${draft.length} seleccionado.`
        : "Toca un punto del recorrido para seleccionarlo.";

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
            <AdminRouteMap published={published ?? []} draft={draft ?? []} selected={selected} placing={mode !== "select"} onPick={pickPoint} />
            <div className="space-y-3 border-t border-[var(--admin-line)] p-4">
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-blue-300">Azul · publicado</span>
                <span className="text-amber-200">Dorado · borrador</span>
              </div>
              <p className="text-sm text-[var(--admin-muted)]" role="status">{draft ? mapHint : "Corrige las coordenadas para seguir editando en el mapa."}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending || !validSelection} aria-pressed={mode === "move"}
                  onClick={() => setMode(mode === "move" ? "select" : "move")} className={buttonClass}><PencilLine className="h-4 w-4" aria-hidden="true" /> Mover punto</button>
                <button type="button" disabled={pending || !draft || draft.length >= MAX_ROUTE_POINTS} aria-pressed={mode === "insert"}
                  onClick={() => setMode(mode === "insert" ? "select" : "insert")} className={buttonClass}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar punto</button>
                <button type="button" disabled={pending || !validSelection || (draft?.length ?? 0) <= 2}
                  onClick={() => { if (draft) setDraft(draft.filter((_, index) => index !== selected)); }} className={buttonClass}><Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar punto</button>
              </div>
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

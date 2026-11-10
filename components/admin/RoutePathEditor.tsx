"use client";

import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { publishRouteRevision } from "@/app/admin/actions";
import {
  INITIAL_ROUTE_ACTION_STATE,
  parseRoutePath,
  type RouteOperationalStatus,
} from "@/lib/admin-route";

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
  linkedReport?: { id: string; label: string; proposedPath: unknown } | null;
};

const fieldClass = "mt-2 h-11 w-full border border-white/10 bg-[var(--brand-header)] px-3 text-sm text-[#dceaca] outline-none transition focus:border-[#6aab48]/70";

function previewPath(serializedPath: string) {
  const points = parseRoutePath(serializedPath);
  if (!points) return null;

  const longitudes = points.map(([longitude]) => longitude);
  const latitudes = points.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const longitudeRange = Math.max(maxLongitude - minLongitude, 0.001);
  const latitudeRange = Math.max(maxLatitude - minLatitude, 0.001);

  const projected = points.map(([longitude, latitude]) => [
    24 + ((longitude - minLongitude) / longitudeRange) * 672,
    236 - ((latitude - minLatitude) / latitudeRange) * 212,
  ]);

  return {
    count: points.length,
    d: projected.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "),
  };
}

export default function RoutePathEditor({ route, linkedReport }: Props) {
  const [state, action, pending] = useActionState(publishRouteRevision, INITIAL_ROUTE_ACTION_STATE);
  const [path, setPath] = useState(() => JSON.stringify(route.path));
  const [color, setColor] = useState(route.color);
  const preview = useMemo(() => previewPath(path), [path]);
  const proposedPath = Array.isArray(linkedReport?.proposedPath)
    ? parseRoutePath(JSON.stringify(linkedReport.proposedPath))
    : null;

  return (
    <form action={action} className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <input type="hidden" name="routeId" value={route.id} />
      <input type="hidden" name="expectedVersion" value={route.dataVersion} />
      {linkedReport && <input type="hidden" name="reportId" value={linkedReport.id} />}

      <div className="space-y-7">
        {linkedReport && (
          <div className="border-l-2 border-[#b8e840] bg-[#b8e840]/[0.06] px-4 py-3 text-sm text-[#c9dbb9]">
            <p>Esta revisión quedará vinculada al reporte aprobado: <strong className="text-[var(--brand-white)]">{linkedReport.label}</strong></p>
            {proposedPath && (
              <button
                type="button"
                onClick={() => setPath(JSON.stringify(proposedPath))}
                className="mt-3 inline-flex h-9 items-center border border-[#b8e840]/30 px-3 text-xs font-black text-[var(--brand-lime)] transition hover:bg-[#b8e840]/10"
              >
                Cargar propuesta como borrador
              </button>
            )}
          </div>
        )}

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-xs font-black uppercase text-[var(--brand-lime)]">Identidad de la ruta</legend>
          <input type="hidden" name="verified" value={route.verified ? "on" : "off"} />
          <label className="block text-xs font-bold text-[var(--admin-muted)]">
            Nombre público
            <input name="name" defaultValue={route.name} required maxLength={120} className={fieldClass} />
          </label>
          <label className="block text-xs font-bold text-[var(--admin-muted)]">
            Nombre de dirección
            <input name="originalName" defaultValue={route.originalName} required maxLength={160} className={fieldClass} />
          </label>
          <label className="block text-xs font-bold text-[var(--admin-muted)]">
            Estado operativo
            <select name="operationalStatus" defaultValue={route.operationalStatus} className={fieldClass}>
              <option value="active">Activa</option>
              <option value="under_review">En revisión</option>
              <option value="inactive">Inactiva</option>
              <option value="historical">Histórica</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[var(--admin-muted)]">
            Ancho de búsqueda (metros)
            <input name="corridorWidthM" type="number" min={10} max={1000} step={10} defaultValue={route.corridorWidthM} required className={fieldClass} />
          </label>
          <label className="block text-xs font-bold text-[var(--admin-muted)]">
            Color
            <span className="mt-2 flex h-11 items-center gap-3 border border-white/10 bg-[var(--brand-header)] px-3">
              <input name="color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0" aria-label="Color de la ruta" />
              <span className="font-mono text-sm uppercase text-[#dceaca]">{color}</span>
            </span>
          </label>
          <div className="flex items-center gap-3 self-end border border-white/10 bg-[var(--brand-header)] px-4 py-3 text-sm font-bold text-[#c9dbb9]">
            <CheckCircle2 className={`h-4 w-4 ${route.verified ? "text-[var(--brand-lime)]" : "text-[var(--admin-muted)]"}`} aria-hidden="true" />
            {route.verified ? "Recorrido comprobado" : "Pendiente de comprobación"}
          </div>
        </fieldset>

        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Coordenadas del recorrido
          <textarea
            name="path"
            value={path}
            onChange={(event) => setPath(event.target.value)}
            required
            rows={12}
            spellCheck={false}
            className="mt-2 w-full resize-y border border-white/10 bg-[var(--brand-header)] p-3 font-mono text-xs leading-5 text-[#c9dbb9] outline-none transition focus:border-[#6aab48]/70"
          />
          <span className="mt-2 block text-[11px] font-normal leading-5 text-[var(--admin-muted)]">Acepta una matriz de coordenadas, un LineString o un Feature GeoJSON. La longitud va primero.</span>
        </label>

        <label className="block text-xs font-bold text-[var(--admin-muted)]">
          Resumen del cambio
          <textarea name="changeSummary" required minLength={10} maxLength={1000} rows={4} placeholder="Qué cambió, cómo se comprobó y con qué fuente..." className="mt-2 w-full resize-y border border-white/10 bg-[var(--brand-header)] p-3 text-sm leading-6 text-[#dceaca] outline-none placeholder:text-white/20 focus:border-[#6aab48]/70" />
        </label>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="border border-white/10 bg-[#0f170c]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-black uppercase text-[var(--admin-muted)]">Vista del trazado</span>
            <span className={`text-xs font-bold ${preview ? "text-[var(--brand-lime)]" : "text-[#f4c84a]"}`}>{preview ? `${preview.count} puntos` : "Datos inválidos"}</span>
          </div>
          <svg viewBox="0 0 720 260" className="block aspect-[18/7] w-full bg-[var(--brand-header)]" role="img" aria-label="Vista previa del recorrido">
            <path d="M0 65H720M0 130H720M0 195H720M180 0V260M360 0V260M540 0V260" stroke="rgba(255,255,255,.05)" strokeWidth="1" />
            {preview && <path d={preview.d} fill="none" stroke="#071006" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />}
            {preview && <path d={preview.d} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <div className="border-t border-white/10 p-4">
            <p className="flex gap-2 text-xs leading-5 text-[var(--admin-muted)]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f4c84a]" /> Publicar cambia lo que reciben el mapa y la API. La versión anterior seguirá disponible para restaurarla.</p>
            {state.status === "error" && <p className="mt-4 border-l-2 border-[#e98b80] px-3 py-2 text-xs leading-5 text-[#f1b3ac]" role="alert">{state.message}</p>}
            <button disabled={pending || !preview} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[var(--brand-lime)] px-5 text-sm font-black text-[#0c110a] transition hover:bg-[#c8f251] disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? <CheckCircle2 className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
              {pending ? "Publicando..." : `Publicar versión ${route.dataVersion + 1}`}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}


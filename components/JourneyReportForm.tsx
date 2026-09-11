"use client";

import { useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import type { CommunityReportType } from "@/lib/community-report";
import { formatRouteLabel, getRouteKey } from "@/lib/route-names";
import { savePendingReport } from "@/lib/journey-report-outbox";

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback); window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
};
const getOnline = () => navigator.onLine;

const issues: { value: CommunityReportType; label: string }[] = [
  { value: "route_changed", label: "El recorrido es incorrecto" },
  { value: "route_inactive", label: "La ruta ya no circula" },
  { value: "schedule_changed", label: "El horario es incorrecto" },
  { value: "landmark_changed", label: "La parada o el transbordo está mal" },
  { value: "other", label: "Otro problema" },
];

export default function JourneyReportForm({ routes, quickFeedback = false }: { routes: string[]; quickFeedback?: boolean }) {
  const id = useId();
  const [routeName, setRouteName] = useState(routes.length === 1 ? routes[0] : "");
  const [reportType, setReportType] = useState<CommunityReportType>("route_changed");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "saved" | "error">("idle");
  const [reasonChosen, setReasonChosen] = useState(false);
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const fieldClass = "ov-panel ov-border ov-text mt-1.5 min-h-11 w-full rounded-xl border px-3 py-2 text-base outline-none focus:border-lima focus:ring-1 focus:ring-lima";
  const validDetails = description.trim().length >= 10 || (quickFeedback && reasonChosen && description.trim().length === 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !routeName || !validDetails || (quickFeedback && !reasonChosen)) return;
    submitting.current = true;
    setState("submitting");
    setError("");
    try {
      const report = {
        reportType, routeName, routeKey: getRouteKey(routeName), website,
        description: description.trim() || `Problema indicado durante el viaje: ${issues.find((issue) => issue.value === reportType)?.label}.`,
        sourcePath: "/mapa",
        place: routes.length > 1 ? `Transbordo: ${routes.join(" → ")}` : null,
      };
      if (!navigator.onLine) {
        savePendingReport(report);
        setState("saved");
        return;
      }
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "No pudimos enviar el reporte. Intenta de nuevo.");
      setState("success");
    } catch (cause) {
      setState("error");
      setError(cause instanceof TypeError ? "Sin conexión. Conservamos tu texto; vuelve a intentar cuando tengas internet." : cause instanceof Error ? cause.message : "No pudimos enviar el reporte.");
    } finally {
      submitting.current = false;
    }
  }

  if (state === "saved") return <div role="status" className="ov-pill mt-2 rounded-xl p-4">
    <p className="ov-text text-sm font-semibold">Reporte guardado en este dispositivo.</p>
    <p className="ov-text-muted mt-1 text-[13px] leading-5">Aún no se ha enviado. Al volver al mapa encontrarás tus reportes pendientes, incluso si cierras la app.</p>
  </div>;

  if (state === "success") return <div role="status" className="mt-2 rounded-xl border border-lima/25 bg-lima/5 p-4">
    <CheckCircle2 className="mb-2 h-5 w-5 text-lima" aria-hidden="true" />
    <p className="ov-text text-sm font-semibold">Reporte enviado. Gracias por ayudarnos.</p>
    <p className="ov-text-muted mt-1 text-[13px] leading-5">Revisaremos la información de {routeName}. Puedes continuar tu viaje.</p>
  </div>;

  return <form onSubmit={submit} className="ov-border mt-2 space-y-3 border-t pt-4" aria-label="Reportar un problema con la ruta">
    {quickFeedback ? <div><h3 className="ov-text text-sm font-semibold">¿Qué salió mal?</h3><p className="ov-text-muted mt-1 text-[13px]">Elige un motivo. Agregar detalles es opcional.</p></div> : <p className="ov-text-muted text-[13px] leading-5">Cuéntanos qué hay que corregir. No necesitas cuenta.</p>}
    {!online && <p role="status" className="text-[13px] text-amber-200">Sin conexión. Puedes guardar el reporte para enviarlo después.</p>}
    <fieldset disabled={state === "submitting"} className="space-y-3 disabled:opacity-60">
      {routes.length > 1 ? <div>
        <label htmlFor={`${id}-route`} className="ov-text text-[13px] font-semibold">¿En qué ruta ocurrió?</label>
        <select id={`${id}-route`} required className={fieldClass} value={routeName} onChange={(event) => setRouteName(event.target.value)}>
          <option value="" disabled>Elige el tramo del viaje</option>
          {routes.map((name, index) => <option key={name} value={name}>{index + 1}. {formatRouteLabel(name)}</option>)}
        </select>
      </div> : <p className="ov-text text-[13px] font-semibold">{formatRouteLabel(routeName)}</p>}
      {quickFeedback ? <fieldset>
        <legend className="ov-text text-[13px] font-semibold">¿Qué pasó?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {issues.map((issue) => <label key={issue.value} className={`ov-border ov-text flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-2 text-xs ${reasonChosen && reportType === issue.value ? "bg-cream-100/10" : "ov-pill"}`}>
            <input type="radio" name={`${id}-reason`} value={issue.value} checked={reasonChosen && reportType === issue.value} onChange={() => { setReasonChosen(true); setReportType(issue.value); }} className="accent-cream-100" />{issue.label}
          </label>)}
        </div>
      </fieldset> : <div>
        <label htmlFor={`${id}-issue`} className="ov-text text-[13px] font-semibold">¿Qué pasó?</label>
        <select id={`${id}-issue`} className={fieldClass} value={reportType} onChange={(event) => setReportType(event.target.value as CommunityReportType)}>
          {issues.map((issue) => <option key={issue.value} value={issue.value}>{issue.label}</option>)}
        </select>
      </div>}
      <div>
        <label htmlFor={`${id}-detail`} className="ov-text text-[13px] font-semibold">Cuéntanos un poco más</label>
        <textarea id={`${id}-detail`} required={!quickFeedback} minLength={10} maxLength={2000} rows={3} className={fieldClass} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Por ejemplo: ahora pasa por otra calle…" aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="ov-text-muted mt-1 text-xs">{quickFeedback ? "Opcional. Si agregas detalles, escribe al menos 10 caracteres." : "Mínimo 10 caracteres. Una calle o referencia nos ayuda."}</p>
      </div>
      <div hidden aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
      <button type="submit" disabled={!routeName || !validDetails || (quickFeedback && !reasonChosen)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-lima px-3 text-sm font-bold text-ink-900 disabled:cursor-not-allowed disabled:opacity-40">
        {state === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
        {state === "submitting" ? "Enviando…" : online ? "Enviar reporte" : "Guardar reporte pendiente"}
      </button>
    </fieldset>
    {error && <p role="alert" className="text-[13px] leading-5 text-amber-200">{error}</p>}
  </form>;
}

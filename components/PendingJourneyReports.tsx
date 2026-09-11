"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getOutboxSnapshot, parseOutbox, removePendingReport, sendPendingReports, subscribeOutbox } from "@/lib/journey-report-outbox";

const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
};
const getOnline = () => navigator.onLine;

export default function PendingJourneyReports() {
  const snapshot = useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, () => "[]");
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const items = parseOutbox(snapshot);
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!online) return;
    // Warm the form while connected so it remains available after losing signal.
    const timer = window.setTimeout(() => { void import("@/components/JourneyReportForm").catch(() => undefined); }, 1000);
    return () => window.clearTimeout(timer);
  }, [online]);

  async function send() {
    if (sending) return;
    setSending(true);
    setMessage("");
    try { const count = await sendPendingReports(); setMessage(count ? "Reportes enviados. Gracias por ayudarnos." : "No quedan reportes pendientes."); }
    catch (error) { setMessage(error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError") ? "No se pudo conectar. Tus reportes siguen guardados." : error instanceof Error ? error.message : "No pudimos enviar los reportes."); }
    finally { setSending(false); }
  }

  if (!items.length && !message) return null;
  return <aside className="ov-panel ov-border fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-20 mx-auto max-w-sm rounded-2xl border p-3 shadow-xl lg:bottom-5 lg:left-auto lg:right-5" aria-label="Reportes pendientes">
    {items.length > 0 ? <>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="ov-text min-h-11 text-left text-[13px] font-semibold">{items.length} reporte{items.length === 1 ? "" : "s"} pendiente{items.length === 1 ? "" : "s"} <span aria-hidden="true">{expanded ? "▴" : "▾"}</span></button>
        <button type="button" disabled={!online || sending} onClick={send} className="ov-pill ov-border ov-text min-h-11 rounded-xl border px-3 text-[12px] font-semibold disabled:opacity-50">{sending ? "Enviando…" : "Enviar pendientes"}</button>
      </div>
      <p className="ov-text-muted text-xs">{online ? "Guardados en este dispositivo. Envíalos cuando quieras." : "Sin conexión. Guardados en este dispositivo."}</p>
      {expanded && <ul className="mt-2 max-h-48 space-y-3 overflow-y-auto">
        {items.map((item) => <li key={item.id} className="ov-border border-t pt-2">
          <p className="ov-text text-xs font-semibold">{item.report.routeName}</p>
          <p className="ov-text-muted text-xs leading-5">{item.report.description}</p>
          <button type="button" disabled={sending} onClick={() => { try { removePendingReport(item.id); } catch { setMessage("No pudimos eliminar el reporte del dispositivo."); } }} className="min-h-11 text-xs text-amber-200">Eliminar reporte de {item.report.routeName}</button>
        </li>)}
      </ul>}
    </> : <button type="button" onClick={() => setMessage("")} className="ov-text float-right min-h-11 px-2 text-xs">Cerrar</button>}
    {message && <p role="status" className="ov-text mt-2 text-xs leading-5">{message}</p>}
  </aside>;
}

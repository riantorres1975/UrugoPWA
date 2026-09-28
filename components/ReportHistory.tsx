"use client";
import { useEffect, useState } from "react";
import { forgetReportReceipt, readReportHistory, REPORT_HISTORY_EVENT, type ReportReceipt } from "@/lib/report-history";
const labels: Record<string, string> = { pending: "Recibido", reviewing: "En revisión", approved: "Aprobado", rejected: "Cerrado sin aprobación" };
export default function ReportHistory() {
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const sync = () => setReceipts(readReportHistory());
    sync(); window.addEventListener(REPORT_HISTORY_EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(REPORT_HISTORY_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  async function refresh() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/community/reports/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(receipts.map((r) => r.token)), signal: AbortSignal.timeout(12_000), cache: "no-store" });
      if (!response.ok) throw new Error();
      const rows = await response.json() as { id: string; status: string }[];
      setStatuses(Object.fromEntries(receipts.map((r) => { const row = rows.find((item) => item.id === r.token.split(".")[0]); return [r.token, row ? labels[row.status] ?? "En revisión" : "Ya no disponible"]; })));
      setMessage("Estado actualizado.");
    } catch { setMessage("No pudimos consultar el estado. Intenta cuando tengas conexión."); }
    finally { setBusy(false); }
  }
  if (!receipts.length) return null;
  return <details className="mt-4 border-t border-white/15 pt-2">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Mis reportes ({receipts.length})</summary>
    <p className="text-xs leading-5 text-[#b6c1af]">Aprobado significa que se aceptó el reporte; no confirma que el mapa ya se actualizó. Se muestran los envíos nuevos de este dispositivo.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()} className="my-2 min-h-11 rounded-lg border border-white/20 px-3 text-sm font-bold text-lima disabled:opacity-50">{busy ? "Consultando…" : "Actualizar estados"}</button>
    <p role="status" className="text-xs text-[#b6c1af]">{message}</p>
    <ul className="divide-y divide-white/15">{receipts.map((r) => <li className="flex items-center justify-between gap-3 py-2" key={r.token}>
      <span className="min-w-0 text-sm">{r.label}<small className="block text-[#b6c1af]">{new Date(r.savedAt).toLocaleDateString("es-MX")} · {statuses[r.token] ?? "Recibido · Consulta su estado actual"}</small></span>
      <button className="min-h-11 shrink-0 px-2 text-xs underline" aria-label={`Quitar del historial: ${r.label}`} onClick={() => forgetReportReceipt(r.token)}>Quitar</button>
    </li>)}</ul>
  </details>;
}

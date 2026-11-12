"use client";
import Link from "next/link";
import { Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { forgetReportReceipt, readReportHistory, REPORT_HISTORY_EVENT, type ReportReceipt } from "@/lib/report-history";
const labels: Record<string, string> = { pending: "Recibido", reviewing: "En revisión", approved: "Aprobado", resolved: "Resuelto", rejected: "Cerrado sin aprobación" };
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
  if (!receipts.length) return (
    <details className="daily-disclosure">
      <summary><Flag className="icon" aria-hidden="true" /> Mis reportes</summary>
      <p>Los reportes que envíes desde este dispositivo aparecerán aquí.</p>
      <Link className="text-link" href="/reportar-error?from=inicio">Enviar un reporte →</Link>
    </details>
  );
  return <details className="daily-disclosure">
    <summary><Flag className="icon" aria-hidden="true" /> Mis reportes ({receipts.length})</summary>
    <p className="text-xs leading-5 text-[#526052]">Aprobado significa que se aceptó el reporte; no confirma que el mapa ya se actualizó. Se muestran los envíos nuevos de este dispositivo.</p>
    <button type="button" disabled={busy} onClick={() => void refresh()} className="daily-link my-2 disabled:opacity-50">{busy ? "Consultando…" : "Actualizar estados"}</button>
    <p role="status" className="text-xs text-[#526052]">{message}</p>
    <ul className="divide-y divide-[#bdc9b4]">{receipts.map((r) => <li className="flex items-center justify-between gap-3 py-2" key={r.token}>
      <span className="min-w-0 text-sm">{r.label}<small className="block text-[#526052]">{new Date(r.savedAt).toLocaleDateString("es-MX")} · {statuses[r.token] ?? "Recibido · Consulta su estado actual"}</small></span>
      <button className="min-h-11 shrink-0 px-2 text-xs underline" aria-label={`Quitar del historial: ${r.label}`} onClick={() => forgetReportReceipt(r.token)}>Quitar</button>
    </li>)}</ul>
  </details>;
}

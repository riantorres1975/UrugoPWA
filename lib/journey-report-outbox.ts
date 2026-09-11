import { parseCommunityReport, type CommunityReportInput } from "@/lib/community-report";

export const REPORT_OUTBOX_KEY = "urugo:report-outbox:v1";
const CHANGE_EVENT = "urugo:report-outbox-changed";
export type PendingReport = { id: string; savedAt: string; report: CommunityReportInput };

export function getOutboxSnapshot(): string {
  try { return localStorage.getItem(REPORT_OUTBOX_KEY) ?? "[]"; } catch { return "[]"; }
}

export function parseOutbox(snapshot: string): PendingReport[] {
  try {
    const items: unknown = JSON.parse(snapshot);
    if (!Array.isArray(items)) return [];
    return items.flatMap((item) => {
      if (!item || typeof item.id !== "string" || typeof item.savedAt !== "string") return [];
      const report = parseCommunityReport(item.report);
      return report ? [{ id: item.id, savedAt: item.savedAt, report }] : [];
    });
  } catch { return []; }
}

export function subscribeOutbox(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function writeOutbox(items: PendingReport[]) {
  localStorage.setItem(REPORT_OUTBOX_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function savePendingReport(input: unknown) {
  const report = parseCommunityReport(input);
  if (!report) throw new Error("Revisa los datos del reporte antes de guardarlo.");
  const items = parseOutbox(getOutboxSnapshot());
  if (items.some((item) => JSON.stringify(item.report) === JSON.stringify(report))) return;
  if (items.length >= 20) throw new Error("Tienes 20 reportes pendientes. Envía o elimina alguno antes de guardar otro.");
  try { writeOutbox([...items, { id: crypto.randomUUID(), savedAt: new Date().toISOString(), report }]); }
  catch { throw new Error("No pudimos guardarlo en este dispositivo. Conserva el texto e intenta enviarlo cuando tengas conexión."); }
}

export function removePendingReport(id: string) {
  writeOutbox(parseOutbox(getOutboxSnapshot()).filter((item) => item.id !== id));
}

let sending = false;
export async function sendPendingReports() {
  const send = async () => {
    if (sending) return 0;
    sending = true;
    let sent = 0;
    try {
      for (const item of parseOutbox(getOutboxSnapshot())) {
        if (!navigator.onLine) throw new Error("Sin conexión. Tus reportes siguen guardados.");
        const response = await fetch("/api/community/reports", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.report),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json().catch(() => null) as { error?: string } | null;
        if (!response.ok) throw new Error(result?.error || "No pudimos enviarlos. Puedes volver a intentarlo.");
        removePendingReport(item.id);
        sent++;
      }
      return sent;
    } finally { sending = false; }
  };
  // A single sender per origin, including when the PWA is open in two tabs.
  return navigator.locks ? navigator.locks.request(REPORT_OUTBOX_KEY, send) : send();
}

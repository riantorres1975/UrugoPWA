export type ReportReceipt = { token: string; label: string; savedAt: number };
const KEY = "urugo-report-receipts-v1";
export const REPORT_HISTORY_EVENT = "urugo-report-history";
export function readReportHistory(): ReportReceipt[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data.filter((r): r is ReportReceipt => r && typeof r.token === "string" && /^[a-f0-9-]{36}\.[a-f0-9]{32}$/.test(r.token) && typeof r.label === "string" && Number.isFinite(r.savedAt)).slice(0, 20) : [];
  } catch { return []; }
}
export function rememberReportReceipt(receipt: unknown, label: string) {
  if (typeof receipt !== "string" || !/^[a-f0-9-]{36}\.[a-f0-9]{32}$/.test(receipt)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([{ token: receipt, label: label.slice(0, 120), savedAt: Date.now() }, ...readReportHistory().filter((r) => r.token !== receipt)].slice(0, 20)));
    window.dispatchEvent(new Event(REPORT_HISTORY_EVENT));
  } catch { /* Sending a report must succeed even if storage is full. */ }
}
export function forgetReportReceipt(token: string) {
  try { localStorage.setItem(KEY, JSON.stringify(readReportHistory().filter((r) => r.token !== token))); window.dispatchEvent(new Event(REPORT_HISTORY_EVENT)); } catch { /* Storage unavailable. */ }
}

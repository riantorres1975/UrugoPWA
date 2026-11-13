import type { SupportVisibility } from "@/lib/support-contributions";

export type SupportReceipt = {
  status: "pending" | "confirmed" | "rejected";
  publication_status: "pending" | "approved" | "withdrawn";
  visibility: SupportVisibility;
  display_name: string | null;
  show_amount: boolean;
  amount_cents: number;
  revision: number;
  created_at: string;
  confirmed_at: string | null;
};
export const SUPPORT_SHARE_URL = "https://www.urugo.app/apoyar";
export const SUPPORT_CONTACT_URL = "mailto:contacto@urugo.app?subject=Consulta%20privada%20sobre%20mi%20aporte";

export function normalizeSupportCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim();
  return /^ug-[a-f0-9]{48}$/i.test(code) ? `UG-${code.slice(3).toLowerCase()}` : null;
}
export function createSupportCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `UG-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
export function supportPrivateHref(code: string) {
  return `/apoyar/mi-aporte#codigo=${encodeURIComponent(code)}`;
}
export function parseSupportPrivacy(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ") : "";
  if (!["anonymous", "named", "private"].includes(String(input.visibility)) || typeof input.showAmount !== "boolean"
    || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1
    || (input.visibility === "named" && (name.length < 2 || name.length > 60 || /[\u0000-\u001f\u007f<>]/.test(name)))) return null;
  return { visibility: input.visibility as SupportVisibility, name: input.visibility === "named" ? name : null,
    showAmount: input.visibility !== "private" && input.showAmount, revision: Number(input.revision) };
}
export function supportMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}
export function validSupportMonth(value: unknown): value is string {
  return typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);
}
export function supportReceiptLabel(receipt: SupportReceipt) {
  if (receipt.status === "pending") return "Pendiente de verificación";
  if (receipt.status === "rejected") return "No se pudo verificar el aporte";
  if (receipt.visibility === "private" || receipt.publication_status === "withdrawn") return "Aporte confirmado · reconocimiento privado";
  return receipt.publication_status === "pending" ? "Aporte confirmado · nombre en revisión" : "Publicado en la comunidad";
}

/** A static, shareable card: never include an amount, payment reference or receipt code. */
export function supportThanksSvg(name = "") {
  const safeName = Array.from(name.trim()).slice(0, 34).join("").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-labelledby="title"><title id="title">Yo apoyo a UruGo</title><rect width="1080" height="1080" rx="48" fill="#14271e"/><circle cx="1000" cy="80" r="280" fill="#203d2c"/><text x="88" y="145" fill="#d4fc76" font-family="sans-serif" font-size="48" font-weight="700">UruGo</text><text x="88" y="340" fill="#f4f3e9" font-family="sans-serif" font-size="76" font-weight="700">Yo apoyo</text><text x="88" y="435" fill="#d4fc76" font-family="sans-serif" font-size="76" font-weight="700">el camino de todos.</text><text x="88" y="535" fill="#bdcbb9" font-family="sans-serif" font-size="28">Para que más personas sigan llegando en Uruapan.</text>${safeName ? `<text x="88" y="620" fill="#f4f3e9" font-family="sans-serif" font-size="30">${safeName}</text>` : ""}<path d="M90 810H310Q350 810 350 770V735Q350 700 390 700H650Q690 700 690 740V770Q690 810 730 810H990" fill="none" stroke="#d4fc76" stroke-width="8" stroke-linecap="round"/><circle cx="90" cy="810" r="18" fill="#d4fc76"/><circle cx="990" cy="810" r="18" fill="#d4fc76"/><text x="88" y="970" fill="#f4f3e9" font-family="sans-serif" font-size="28">urugo.app/apoyar · Un mapa abierto para todos</text></svg>`;
}

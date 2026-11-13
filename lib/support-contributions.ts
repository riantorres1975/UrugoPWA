export const SUPPORT_METHODS = { paypal: "PayPal", mercadopago: "Mercado Pago", spei: "Transferencia SPEI" } as const;
export type SupportMethod = keyof typeof SUPPORT_METHODS;
export type SupportVisibility = "anonymous" | "named" | "private";
export type SupportWallData = { confirmedCount: number; supporters: { id: string; name: string; amount_cents: number | null; confirmed_at: string }[] };

export function parseSupportAmount(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,6}(?:[.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole, decimal = ""] = value.trim().split(/[.,]/);
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return cents >= 100 && cents <= 10_000_000 ? cents : null;
}
export function formatSupportAmount(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}
export function parseSupportClaim(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const amount = parseSupportAmount(v.amount);
  const reference = typeof v.reference === "string" ? v.reference.trim() : "";
  const name = typeof v.name === "string" ? v.name.trim().replace(/\s+/g," ") : "";
  if (amount === null || v.paid !== true || !Object.hasOwn(SUPPORT_METHODS, String(v.method))
    || !["anonymous","named","private"].includes(String(v.visibility))
    || reference.length < 6 || reference.length > 120 || /[\u0000-\u001f\u007f]/.test(reference)
    || (v.visibility === "named" && (name.length < 2 || name.length > 60 || /[\u0000-\u001f\u007f<>]/.test(name)))
    || typeof v.showAmount !== "boolean" || (v.website !== undefined && typeof v.website !== "string")) return null;
  return { method: v.method as SupportMethod, amount_cents: amount, reference, visibility: v.visibility as SupportVisibility,
    display_name: v.visibility === "named" ? name : null, show_amount: v.visibility !== "private" && v.showAmount, website: String(v.website ?? "").slice(0,200) };
}

export function paypalAmountUrl(base: string, amount: number | null) {
  try {
    const url = new URL(base);
    if (amount && url.hostname === "www.paypal.com" && /^\/paypalme\/[^/]+\/?$/.test(url.pathname)) url.pathname = url.pathname.replace(/\/$/, "") + "/" + amount + "MXN";
    return url.toString();
  } catch { return base; }
}

import { describe, expect, it } from "vitest";
import { createSupportCode, normalizeSupportCode, parseSupportPrivacy, supportMonthKey, supportPrivateHref, supportThanksSvg, supportReceiptLabel, type SupportReceipt } from "@/lib/support-management";
import { hashSupportCode, hashPaymentReference } from "@/lib/support-access-server";
import { safeAnalyticsUrl } from "@/lib/analytics-url";
const code = "UG-" + "ab".repeat(24);
const receipt: SupportReceipt = { status: "confirmed", publication_status: "approved", visibility: "named", display_name: "Ana", show_amount: false, amount_cents: 5000, revision: 2, created_at: "2026-11-13T16:00:00Z", confirmed_at: "2026-11-13T16:10:00Z" };
describe("códigos privados de apoyo", () => {
  it("genera secretos distintos, normaliza el código y solo guarda una huella", () => {
    const generated = createSupportCode(); expect(generated).toMatch(/^UG-[a-f0-9]{48}$/);
    expect(createSupportCode()).not.toBe(generated);
    expect(normalizeSupportCode(` ${code.toUpperCase()} `)).toBe(code);
    for (const invalid of [null, "12345", "UG-abc", code + "x", "/mi-aporte?codigo=abc"]) expect(normalizeSupportCode(invalid)).toBeNull();
    expect(hashSupportCode(code)).toMatch(/^[a-f0-9]{64}$/); expect(hashSupportCode(code)).not.toContain(code);
    expect(hashPaymentReference(" AbC 123 ")).toBe(hashPaymentReference("abc123"));
  });
  it("transporta el acceso en el fragmento y lo excluye de toda telemetría", () => {
    const href = supportPrivateHref(code); expect(href).toContain("#codigo="); expect(href).not.toContain("?");
    expect(safeAnalyticsUrl(`https://www.urugo.app${href}`)).toBeNull();
    expect(safeAnalyticsUrl(`https://www.urugo.app/mapa?a=exact&b=exact&code=${code}#${code}`)).toBe("https://www.urugo.app/mapa");
  });
  it("valida consentimiento, nombre y revisión sin permitir cambiar el importe", () => {
    expect(parseSupportPrivacy({ visibility: "private", showAmount: true, revision: 2, amount: "999" })).toEqual({ visibility: "private", name: null, showAmount: false, revision: 2 });
    expect(parseSupportPrivacy({ visibility: "named", name: " Ana   López ", showAmount: false, revision: 2 })?.name).toBe("Ana López");
    expect(parseSupportPrivacy({ visibility: "named", name: "<script>", showAmount: true, revision: 2 })).toBeNull();
    expect(parseSupportPrivacy({ visibility: "anonymous", showAmount: false, revision: 0 })).toBeNull();
  });
  it("distingue un pago verificado de un nombre pendiente o un agradecimiento retirado", () => {
    expect(supportReceiptLabel(receipt)).toContain("Publicado");
    expect(supportReceiptLabel({ ...receipt, publication_status: "pending" })).toContain("nombre en revisión");
    expect(supportReceiptLabel({ ...receipt, visibility: "private" })).toContain("privado");
    expect(supportReceiptLabel({ ...receipt, status: "pending" })).toContain("Pendiente");
  });
  it("la tarjeta se puede compartir sin importe ni código y escapa nombres", () => {
    const svg = supportThanksSvg('Ana <script> & "López"');
    expect(svg).toContain("&lt;script&gt;"); expect(svg).not.toContain("<script>");
    expect(svg).not.toContain(code); expect(svg).not.toContain("5000"); expect(svg).not.toContain("MXN");
    expect(svg).toContain("urugo.app/apoyar");
  });
  it("usa el mes de Uruapan al cambiar de mes en UTC", () => {
    expect(supportMonthKey(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
    expect(supportMonthKey(new Date("2026-12-01T07:00:00Z"))).toBe("2026-12");
  });
});

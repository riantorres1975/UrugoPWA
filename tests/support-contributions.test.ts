import { describe, expect, it } from "vitest";
import { parseSupportAmount, parseSupportClaim, paypalAmountUrl } from "@/lib/support-contributions";
import { canShowSupportReminder, registerSupportVisit, SUPPORT_REMINDER_DELAY } from "@/lib/support-reminder";

const claim = { method: "paypal", amount: "50.25", reference: "ABC123456", visibility: "anonymous", showAmount: false, paid: true };
describe("avisos de aportaciones", () => {
  it("convierte pesos sin errores de coma flotante y rechaza montos inválidos", () => {
    expect(parseSupportAmount("25,01")).toBe(2501);
    expect(parseSupportAmount(" 100000.00 ")).toBe(10000000);
    for (const invalid of ["0", "-50", "0.99", "100000.01", "1e3", "5.005", "NaN", 50]) expect(parseSupportAmount(invalid)).toBeNull();
  });
  it("solo acepta un aviso después del pago y exige consentimiento de nombre", () => {
    expect(parseSupportClaim(claim)).toMatchObject({ amount_cents: 5025, visibility: "anonymous", display_name: null, show_amount: false });
    expect(parseSupportClaim({ ...claim, paid: false })).toBeNull();
    expect(parseSupportClaim({ ...claim, visibility: "named", name: " " })).toBeNull();
    expect(parseSupportClaim({ ...claim, visibility: "named", name: " Ana   López " })).toMatchObject({ display_name: "Ana López" });
    expect(parseSupportClaim({ ...claim, visibility: "named", name: "<script>" })).toBeNull();
    expect(parseSupportClaim({ ...claim, visibility: "private", name: "Ana", showAmount: true })).toMatchObject({ display_name: null, show_amount: false });
    expect(parseSupportClaim({ ...claim, method: "inventado" })).toBeNull();
  });
  it("solo modifica enlaces PayPal.me reconocidos y deja libre el otro monto", () => {
    expect(paypalAmountUrl("https://www.paypal.com/paypalme/wh0code", 50)).toBe("https://www.paypal.com/paypalme/wh0code/50MXN");
    expect(paypalAmountUrl("https://www.paypal.com/paypalme/wh0code", null)).toBe("https://www.paypal.com/paypalme/wh0code");
    expect(paypalAmountUrl("https://checkout.example/abc", 50)).toBe("https://checkout.example/abc");
  });
});
describe("recordatorio discreto", () => {
  const now = 1000000000;
  it("no trata recargas como visitas ni muestra el aviso en el primer uso", () => {
    const first = registerSupportVisit(null, now);
    expect(registerSupportVisit(JSON.stringify(first), now + 1000)).toEqual(first);
    expect(canShowSupportReminder(first, 0, now + SUPPORT_REMINDER_DELAY, now)).toBe(false);
    expect(registerSupportVisit("corrupto", now)).toEqual(first);
  });
  it("espera otro uso, un minuto de sesión y respeta el cierre durante 30 días", () => {
    const visits = registerSupportVisit(JSON.stringify({ count: 1, lastVisit: now - 7 * 3600000 }), now);
    expect(canShowSupportReminder(visits, 0, now + 59000, now)).toBe(false);
    expect(canShowSupportReminder(visits, 0, now + 60000, now)).toBe(true);
    expect(canShowSupportReminder(visits, now + 30 * 86400000, now + 60000, now)).toBe(false);
    expect(canShowSupportReminder(visits, NaN, now + 60000, now)).toBe(false);
  });
});

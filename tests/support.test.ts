import { describe, expect, it } from "vitest";
import { PROJECT } from "@/lib/project";
import { getSupportOptions } from "@/lib/support";

describe("support options", () => {
  it("keeps PayPal available without additional configuration", () => {
    expect(getSupportOptions({})).toEqual({
      mercadoPagoUrl: null,
      paypalUrl: PROJECT.donationUrl,
      spei: null,
    });
  });

  it("accepts HTTPS payment links and complete SPEI details", () => {
    expect(
      getSupportOptions({
        SUPPORT_MERCADOPAGO_URL: " https://mpago.la/example ",
        SUPPORT_PAYPAL_URL: "https://paypal.me/example",
        SUPPORT_SPEI_CLABE: "123 456 789 012 345 678",
        SUPPORT_SPEI_RECIPIENT: " Antonio Rivera ",
        SUPPORT_SPEI_BANK: "Banco de prueba",
      }),
    ).toEqual({
      mercadoPagoUrl: "https://mpago.la/example",
      paypalUrl: "https://paypal.me/example",
      spei: {
        clabe: "123456789012345678",
        recipient: "Antonio Rivera",
        bank: "Banco de prueba",
      },
    });
  });

  it("rejects unsafe links and incomplete bank details", () => {
    expect(
      getSupportOptions({
        SUPPORT_MERCADOPAGO_URL: "https://user:secret@example.com",
        SUPPORT_PAYPAL_URL: "javascript:alert(1)",
        SUPPORT_SPEI_CLABE: "1234",
        SUPPORT_SPEI_RECIPIENT: "Antonio Rivera",
      }),
    ).toEqual({
      mercadoPagoUrl: null,
      paypalUrl: PROJECT.donationUrl,
      spei: null,
    });
  });
});

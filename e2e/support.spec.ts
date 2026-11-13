import { expect, test } from "./fixtures";
import { FARE_UPDATE_ANNOUNCEMENT, getAnnouncementDismissalKey } from "../lib/fare-update-announcement";

test("la pagina de apoyo explica el destino y abre el proveedor fuera de UruGo", async ({ page }) => {
  await page.goto("/apoyar");

  await expect(page.getByRole("heading", { name: /Tú llegas.*UruGo sigue/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Detrás de cada llegada/ })).toBeVisible();

  const mainPayment = page.locator(".support-payment-card > .support-pay-primary");
  await expect(mainPayment).toHaveAttribute("href", /^https:\/\//);
  await expect(mainPayment).toHaveAttribute("target", "_blank");
  if (await page.getByRole("link", { name: "Apoyar con Mercado Pago" }).count()) {
    await expect(mainPayment).toHaveAccessibleName(/Mercado Pago/);
    await expect(page.getByLabel("Medio de apoyo")).toHaveValue("mercadopago");
    await expect(page.getByRole("group", { name: /Monto sugerido/ })).not.toBeVisible();
  }

  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Apoyar UruGo" }).first()).toHaveAttribute("href", "/apoyar");
});

test("el monto sugerido llega al proveedor y el aviso respeta la privacidad", async ({ page }) => {
  await page.goto("/apoyar");
  const paypalAlternative = page.locator(".support-paypal-alternative summary");
  if (await paypalAlternative.count()) await paypalAlternative.click();
  await page.getByRole("button", { name: "$100 MXN", exact: true }).click();
  await expect(page.getByRole("link", { name: /Apoyar con PayPal/ })).toHaveAttribute("href", /100MXN$/);
  await page.getByRole("button", { name: /Otro monto libre/ }).click();
  await expect(page.getByRole("link", { name: /Apoyar con PayPal/ })).not.toHaveAttribute("href", /100MXN$/);
  await page.getByLabel("Monto enviado en MXN").fill("50.25");
  await page.getByLabel("ID de transacción o clave de rastreo").fill("REFERENCE-TEST-123");
  await page.getByLabel("Con mi nombre", { exact: true }).check();
  await page.getByLabel("Nombre para mostrar").fill("Nombre de prueba");
  await page.getByLabel("También quiero mostrar el monto").check();
  await page.getByLabel("No aparecer", { exact: true }).check();
  await expect(page.getByLabel("Nombre para mostrar")).toHaveCount(0);
  await expect(page.getByLabel("También quiero mostrar el monto")).toHaveCount(0);
  await page.getByLabel("Confirmo que ya realicé el aporte").check();
  let sent: Record<string, unknown> = {};
  await page.route("**/api/support/contributions", (route) => { sent = route.request().postDataJSON(); return route.fulfill({ status: 201, json: { ok: true } }); });
  await page.getByRole("button", { name: "Enviar para verificación" }).click();
  await expect(page.getByRole("status")).toContainText("pendiente de verificación");
  expect(sent).toMatchObject({ visibility: "private", name: null, showAmount: false, amount: "50.25" });
  expect(await page.evaluate(() => Number(localStorage.getItem("urugo-support-reminder-until-v1")) > Date.now())).toBe(true);
});

test("apoyo se adapta a pantallas pequeñas y respeta movimiento reducido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/apoyar");
    await page.evaluate(() => document.fonts.ready.then(() => null));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".support-route-flow")).toHaveCSS("animation-name", "none");
  }
});

test("un fallo de conexión conserva el formulario y permite reintentar sin confirmar un pago", async ({ page }) => {
  await page.goto("/apoyar");
  await page.getByLabel("Monto enviado en MXN").fill("50");
  await page.getByLabel("ID de transacción o clave de rastreo").fill("OFFLINE-TEST-123");
  await page.getByLabel("Confirmo que ya realicé el aporte").check();
  await page.route("**/api/support/contributions", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Enviar para verificación" }).click();
  await expect(page.locator(".support-form").getByRole("alert")).toContainText("Conserva tu comprobante");
  await expect(page.getByLabel("ID de transacción o clave de rastreo")).toHaveValue("OFFLINE-TEST-123");
  await expect(page.getByRole("button", { name: "Enviar para verificación" })).toBeEnabled();
  await expect(page.getByRole("status").filter({ hasText: "pendiente de verificación" })).toHaveCount(0);
});

test("el recordatorio respeta búsquedas, se cierra y no reaparece al recargar", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(({ fareKey }) => {
    localStorage.setItem("rutas-uru-onboarded", "1"); localStorage.setItem(fareKey, "e2e");
    if (!localStorage.getItem("urugo-support-visits-v1")) localStorage.setItem("urugo-support-visits-v1", JSON.stringify({ count: 1, lastVisit: Date.now() - 7 * 3600000 }));
  }, { fareKey: getAnnouncementDismissalKey(FARE_UPDATE_ANNOUNCEMENT.id) });
  await page.goto("/mapa");
  const search = page.getByRole("combobox").first();
  await expect(search).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("urugo-support-visits-v1") ?? "{}").count)).toBe(2);
  await search.focus();
  await page.clock.fastForward(65000);
  const reminder = page.getByRole("complementary", { name: "Apoyo voluntario a UruGo" });
  await expect(reminder).toHaveCount(0);
  await search.press("Escape");
  await search.press("Tab");
  await page.clock.fastForward(1100);
  await expect(reminder).toBeVisible();
  await reminder.getByRole("button", { name: "Cerrar recordatorio por 30 días" }).click();
  await expect(reminder).toHaveCount(0);
  expect(await page.evaluate(() => Number(localStorage.getItem("urugo-support-reminder-until-v1")) > Date.now() + 29 * 86400000)).toBe(true);
  await page.reload(); await page.clock.fastForward(65000);
  await expect(reminder).toHaveCount(0);
});

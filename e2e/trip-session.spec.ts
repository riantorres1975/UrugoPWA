import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

async function provideFreshFix(page: Page, longitude: number) {
  await page.evaluate((lng) => {
    navigator.geolocation.getCurrentPosition = (success, _error, options) => {
      sessionStorage.setItem("requested-gps-age", String(options?.maximumAge));
      success({ coords: { longitude: lng, latitude: 19.42, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() } as GeolocationPosition);
    };
  }, longitude);
}

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: -102.077, latitude: 19.42 });
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      speak: (message: SpeechSynthesisUtterance) => sessionStorage.setItem("spoken", message.text),
      cancel: () => sessionStorage.setItem("speech-cancelled", "1"),
    } });
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: (pattern: number | number[]) => {
      sessionStorage.setItem("vibration", JSON.stringify(pattern)); return true;
    } });
  });
  await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: [{
    id: 1, name: "Ruta de prueba", original_name: "Ruta de prueba Ida", color: "#0088ff", corridor_width_m: 400,
    path: [[-102.08, 19.42], [-102.07, 19.42], [-102.06, 19.42]],
  }] }));
});

test("confirma la subida, recupera el mismo viaje y permite finalizarlo", async ({ page, context }, testInfo) => {
  await page.goto("/mapa?a=-102.077000,19.420000&b=-102.060000,19.423000");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("Ruta de prueba", { timeout: 15_000 });
  await preview.click();
  await page.getByRole("button", { name: "Iniciar viaje en Ruta de prueba", exact: true }).click();
  const panel = page.getByRole("region", { name: "Modo viaje" });
  await expect(panel.getByRole("button", { name: "Ya subí", exact: true })).toBeEnabled();
  await context.setGeolocation({ longitude: -102.073, latitude: 19.42 });
  await expect(panel).toContainText("VE AL PUNTO DE SUBIDA");
  await expect(panel).not.toContainText("EN CAMINO");
  await panel.getByRole("button", { name: "Ya subí", exact: true }).click();
  await expect(panel).toContainText("EN CAMINO");
  await panel.getByRole("button", { name: "Detalles y avisos ↓" }).click();
  await expect(panel.getByRole("checkbox", { name: "Voz", exact: true })).not.toBeChecked();
  await panel.getByRole("checkbox", { name: "Voz", exact: true }).check();
  await panel.getByRole("checkbox", { name: "Vibración", exact: true }).check();
  await context.setGeolocation({ longitude: -102.062, latitude: 19.42 });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("spoken"))).toContain("Prepárate para bajar");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("vibration"))).toBe("[200,100,200]");
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await panel.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("viaje-detalles-320.png") });
  const savedJourney = await page.evaluate(() => JSON.parse(localStorage.getItem("urugo-active-trip-v1")!).journey);
  await page.goto("/mapa");
  const recovery = page.getByRole("region", { name: "Recuperar viaje" });
  await expect(recovery).toContainText("Ruta de prueba");
  await expect(panel).toHaveCount(0);
  // An unavailable GPS must keep the saved journey pending.
  await page.evaluate(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 2, message: "Unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      navigator.geolocation.getCurrentPosition = original;
    };
  });
  await recovery.getByRole("button", { name: "Continuar viaje" }).click();
  await expect(recovery.getByRole("alert")).toContainText("No pudimos actualizar");
  await expect(panel).toHaveCount(0);
  await context.setGeolocation({ longitude: -102.065, latitude: 19.42 });
  await provideFreshFix(page, -102.065);
  await recovery.getByRole("button", { name: "Continuar viaje" }).click();
  await expect(panel).toContainText("EN CAMINO");
  expect(await page.evaluate(() => sessionStorage.getItem("requested-gps-age"))).toBe("0");
  await expect(recovery).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("urugo-active-trip-v1")!).journey)).toEqual(savedJourney);
  await panel.getByRole("button", { name: "Detalles y avisos ↓" }).click();
  await expect(panel.getByRole("checkbox", { name: "Voz", exact: true })).toBeChecked();
  await panel.getByRole("button", { name: "Ya bajé", exact: true }).click();
  await expect(panel).toContainText("ÚLTIMO TRAMO");
  await panel.getByRole("button", { name: "Finalizar viaje", exact: true }).click();
  await page.getByRole("dialog", { name: "¿Finalizar el viaje?" }).getByRole("button", { name: "Finalizar viaje" }).click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("urugo-active-trip-v1"))).toBeNull();
  await page.reload();
  await expect(recovery).toHaveCount(0);
});

test("busca desde el GPS actual conservando el destino y sin interrumpir por un error", async ({ page, context }) => {
  await page.goto("/mapa?a=-102.077000,19.420000&b=-102.060000,19.423000");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("Ruta de prueba", { timeout: 15_000 });
  await preview.click();
  await page.getByRole("button", { name: "Iniciar viaje en Ruta de prueba", exact: true }).click();
  const panel = page.getByRole("region", { name: "Modo viaje" });
  await panel.getByRole("button", { name: "Ya subí", exact: true }).click();
  await panel.getByRole("button", { name: "Detalles y avisos ↓" }).click();
  await page.evaluate(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 2, message: "Unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      navigator.geolocation.getCurrentPosition = original;
    };
  });
  await panel.getByRole("button", { name: "Buscar otra opción desde aquí" }).click();
  await expect(panel.getByRole("alert")).toContainText("Tu viaje sigue activo");
  await context.setGeolocation({ longitude: -102.07, latitude: 19.42 });
  await provideFreshFix(page, -102.07);
  await panel.getByRole("button", { name: "Buscar otra opción desde aquí" }).click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("urugo-active-trip-v1"))).toBeNull();
  await page.getByRole("button", { name: "Iniciar viaje en Ruta de prueba", exact: true }).click();
  await expect(panel).toBeVisible();
  const nextJourney = await page.evaluate(() => JSON.parse(localStorage.getItem("urugo-active-trip-v1")!).journey);
  expect(nextJourney.origin).toEqual([-102.07, 19.42]);
  expect(nextJourney.destination).toEqual([-102.06, 19.423]);
});

import { expect, test } from "./fixtures";

test("el modo viaje retira el aviso de transbordo al pasar al segundo tramo", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: -102.079, latitude: 19.42 });
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: [
    { id: 1, name: "Ruta Oeste", original_name: "Ruta Oeste Ida", color: "#0088ff", corridor_width_m: 400,
      path: [[-102.08, 19.42], [-102.07, 19.42]] },
    { id: 2, name: "Ruta Norte", original_name: "Ruta Norte Ida", color: "#00aa00", corridor_width_m: 400,
      path: [[-102.0695, 19.42], [-102.0695, 19.44]] },
  ] }));
  await page.goto("/mapa?a=-102.079000,19.420000&b=-102.069500,19.440000");
  const option = page.getByRole("button", { name: /Seleccionar transbordo de Ruta Oeste a Ruta Norte/ }).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await page.getByRole("button", { name: "Iniciar viaje con transbordo", exact: true }).click();
  const panel = page.getByRole("region", { name: "Modo viaje" });
  await panel.getByRole("button", { name: "Ya subí", exact: true }).click();
  await expect(panel).toContainText("PRIMER TRAMO");
  await context.setGeolocation({ longitude: -102.073, latitude: 19.42 });
  const alert = page.getByRole("alert").filter({ hasText: "Prepárate para transbordar" });
  await expect(alert).toBeVisible();
  await context.setGeolocation({ longitude: -102.07, latitude: 19.42 });
  await expect(panel).toContainText("TRANSBORDO");
  await expect(alert).toHaveCount(0);
  await context.setGeolocation({ longitude: -102.0695, latitude: 19.424 });
  await panel.getByRole("button", { name: "Ya subí", exact: true }).click();
  await expect(panel).toContainText("SEGUNDO TRAMO");
  await expect(panel).toContainText("Ruta Norte");
  await expect(alert).toHaveCount(0);
});

test("el modo viaje avanza referencias y avisos hasta terminar la caminata final", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ longitude: -102.077, latitude: 19.42 });
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.addInitScript(() => {
    const geo = navigator.geolocation;
    const watch = geo.watchPosition.bind(geo);
    const clear = geo.clearWatch.bind(geo);
    const errors = new Map<number, PositionErrorCallback>();
    geo.watchPosition = (success, error, options) => {
      const id = watch(success, error, options);
      if (error) errors.set(id, error);
      return id;
    };
    geo.clearWatch = (id) => { errors.delete(id); clear(id); };
    window.addEventListener("urugo:test-signal-lost", () => {
      for (const error of errors.values()) error({
        code: 2, message: "Signal lost", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3,
      });
    });
  });
  await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: [{
    id: 1, name: "Ruta de prueba", original_name: "Ruta de prueba Ida",
    color: "#0088ff", corridor_width_m: 400,
    path: [[-102.08, 19.42], [-102.07, 19.42], [-102.06, 19.42]],
    landmarks: [
      { name: "Centro", point: [-102.075, 19.42] },
      { name: "Hospital", point: [-102.067, 19.42] },
    ],
  }] }));
  await page.goto("/mapa?a=-102.077000,19.420000&b=-102.060000,19.423000");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("Ruta de prueba", { timeout: 15_000 });
  await preview.click();
  await page.getByRole("button", { name: "Iniciar viaje en Ruta de prueba", exact: true }).click();

  const panel = page.getByRole("region", { name: "Modo viaje" });
  const referenceAlert = page.getByRole("alert").filter({ hasText: "Próxima referencia:" });
  await panel.getByRole("button", { name: "Ya subí", exact: true }).click();
  await expect(panel).toContainText("Próxima referencia: Centro");
  await expect(referenceAlert).toContainText("Centro");
  const initialAlert = await referenceAlert.innerText();
  await page.evaluate(() => window.dispatchEvent(new Event("urugo:test-signal-lost")));
  await expect(panel).toContainText("GPS NO DISPONIBLE");
  await expect(referenceAlert).toHaveCount(0);
  await context.setGeolocation({ longitude: -102.076, latitude: 19.42 });
  await expect(referenceAlert).not.toHaveText(initialAlert);
  await expect(referenceAlert).toContainText("Centro");

  await context.setGeolocation({ longitude: -102.075, latitude: 19.42 });
  await expect(panel).toContainText("Próxima referencia: Hospital");
  await expect(referenceAlert).toHaveCount(0);

  await context.setGeolocation({ longitude: -102.069, latitude: 19.42 });
  await expect(referenceAlert).toContainText("Hospital");
  await referenceAlert.getByRole("button", { name: "Cerrar aviso" }).click();
  await context.setGeolocation({ longitude: -102.068, latitude: 19.42 });
  await expect(panel).toContainText(/Hospital · ~10\d m/);
  await expect(referenceAlert).toHaveCount(0);

  await context.setGeolocation({ longitude: -102.067, latitude: 19.42 });
  await expect(panel).not.toContainText("Próxima referencia:");
  await expect(referenceAlert).toHaveCount(0);

  await context.setGeolocation({ longitude: -102.063, latitude: 19.42 });
  const alightingAlert = page.getByRole("alert").filter({ hasText: "Prepárate para bajar" });
  await expect(alightingAlert).toBeVisible();
  const initialAlightingAlert = await alightingAlert.innerText();
  await context.setGeolocation({ longitude: -102.062, latitude: 19.42 });
  await expect(alightingAlert).not.toHaveText(initialAlightingAlert);

  for (const viewport of [{ width: 360, height: 640 }, { width: 820, height: 400 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(async () => {
      const alertBox = await alightingAlert.boundingBox();
      const panelBox = await panel.boundingBox();
      expect(alertBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(alertBox!.y + alertBox!.height).toBeLessThanOrEqual(panelBox!.y);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(alertBox!.y).toBeGreaterThanOrEqual(0);
    }).toPass();
    await panel.getByRole("button", { name: "Finalizar viaje", exact: true }).click();
    // Cover keyboard cancellation too; the dev tools badge overlaps this button on small screens.
    await page.getByRole("dialog", { name: "¿Finalizar el viaje?" }).getByRole("button", { name: "Cancelar" }).press("Enter");
  }
  await page.screenshot({ path: testInfo.outputPath("modo-viaje-avisos.png") });
  await context.setGeolocation({ longitude: -102.06, latitude: 19.42 });
  await expect(panel).toContainText("ÚLTIMO TRAMO");
  await expect(alightingAlert).toHaveCount(0);
  expect(Number(await panel.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeLessThan(100);

  await context.setGeolocation({ longitude: -102.06, latitude: 19.423 });
  await expect(panel).toContainText("ÚLTIMO TRAMO");
  await context.setGeolocation({ longitude: -102.05999, latitude: 19.423 });
  await expect(panel).toContainText("Llegaste");
  await expect(panel.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await panel.getByRole("button", { name: "Cerrar viaje completado" }).click();
  await expect(panel).toHaveCount(0);
});

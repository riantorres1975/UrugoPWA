import { expect, test } from "./fixtures";

for (const fallback of [false, true]) {
  test(`los límites de caminata y tiempo se aplican y persisten (${fallback ? "sin worker" : "worker"})`, async ({ page }, testInfo) => {
    await page.addInitScript((disableWorker) => {
      localStorage.setItem("rutas-uru-onboarded", "1");
      if (disableWorker) {
        const NativeWorker = window.Worker;
        window.Worker = new Proxy(NativeWorker, { construct(target, args) {
          if (args[1]?.name === "urugo-route-calculation") throw new Error("Test fallback");
          return Reflect.construct(target, args);
        } });
      }
    }, fallback);
    await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: [
      { id: 1, name: "Ruta cercana", original_name: "Ruta cercana Ida", color: "#00aa00", corridor_width_m: 400,
        path: [[-102.06, 19.42], [-102.06, 19.393], [-102.04, 19.393], [-102.04, 19.42]] },
      { id: 2, name: "Ruta rápida", original_name: "Ruta rápida Ida", color: "#0088ff", corridor_width_m: 400,
        path: [[-102.06, 19.4225], [-102.04, 19.4225]] },
    ] }));
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/mapa?a=-102.060000,19.420000&b=-102.040000,19.420000");
    const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
    await expect(preview).toContainText("Ruta rápida", { timeout: 15000 });
    await preview.click();
    const panel = page.getByRole("dialog");
    await panel.getByRole("button", { name: /Ajustar caminata y tiempo/ }).click();
    await panel.getByRole("radio", { name: "Hasta 15 min más", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Iniciar viaje en Ruta cercana", exact: true })).toBeVisible();
    await expect(panel.getByLabel("Comparación de esta opción")).toContainText("m menos");
    await panel.getByRole("radio", { name: "Hasta 300 m", exact: true }).click();
    await panel.getByRole("button", { name: "Más rápida", exact: true }).click();
    await expect(panel.getByRole("button", { name: "Iniciar viaje en Ruta cercana", exact: true })).toBeVisible();
    expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("ajustes-caminata.png"), animations: "disabled" });
    await page.reload();
    await expect(preview).toContainText("Ruta cercana");
    await preview.click();
    await panel.getByRole("button", { name: /Ajustar caminata y tiempo/ }).click();
    await expect(panel.getByRole("radio", { name: "Hasta 300 m", exact: true })).toHaveAttribute("aria-checked", "true");
    await panel.getByRole("button", { name: "Menos caminata", exact: true }).click();
    await expect(panel.getByRole("radio", { name: "Hasta 15 min más", exact: true })).toHaveAttribute("aria-checked", "true");
  });
}

for (const fallback of [false, true]) {
  test(`la preferencia cambia la recomendación y se conserva al recargar (${fallback ? "sin worker" : "worker"})`, async ({ page }, testInfo) => {
    await page.addInitScript((disableWorker) => {
      localStorage.setItem("rutas-uru-onboarded", "1");
      if (disableWorker) {
        const NativeWorker = window.Worker;
        window.Worker = new Proxy(NativeWorker, { construct(target, args) {
          if (args[1]?.name === "urugo-route-calculation") throw new Error("Test fallback");
          return Reflect.construct(target, args);
        } });
      }
    }, fallback);
    await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: [
      { id: 1, name: "Ruta cercana", original_name: "Ruta cercana Ida", color: "#00aa00", corridor_width_m: 400,
        path: [[-102.06, 19.42], [-102.06, 19.431], [-102.04, 19.431], [-102.04, 19.42]] },
      { id: 2, name: "Ruta rápida", original_name: "Ruta rápida Ida", color: "#0088ff", corridor_width_m: 400,
        path: [[-102.06, 19.4225], [-102.04, 19.4225]] },
    ] }));
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/mapa?a=-102.060000,19.420000&b=-102.040000,19.420000");
    const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
    await expect(preview).toContainText("Ruta cercana");
    await preview.click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("button", { name: "Menos caminata", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("0 m a pie en total");
    await page.screenshot({ path: testInfo.outputPath("selector.png"), animations: "disabled", scale: "css" });
    await panel.getByRole("button", { name: "Más rápida", exact: true }).click();
    await expect(panel.getByRole("button", { name: /Iniciar viaje en Ruta rápida/ })).toBeVisible();
    await expect(panel.getByLabel("Caminata del viaje").first()).toContainText(/55\d m a pie en total/);
    await panel.locator("summary").click();
    await expect(panel.getByRole("article").first()).toContainText("m menos");
    await panel.getByRole("button", { name: /Usar Ruta cercana como ruta recomendada/ }).click();
    await expect(panel.getByRole("button", { name: /Iniciar viaje en Ruta cercana/ })).toBeVisible();
    expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("preferencias.png"), animations: "disabled" });
    await page.reload();
    await expect(preview).toContainText("Ruta rápida");
    await preview.click();
    await expect(panel.getByRole("button", { name: "Más rápida", exact: true })).toHaveAttribute("aria-pressed", "true");
  });
}

test("permite alternar entre un transbordo recomendado y una ruta directa", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  const paths = [
    [[0, 0], [0.02, 0]],
    [[0.01, -0.01], [0.01, 0.02]],
    [[0, -0.004], [0.014, -0.004], [0.014, 0.02]],
  ];
  await page.route("**/api/rutas-polyline", (request) => request.fulfill({ json: paths.map((path, index) => ({
    id: index + 1, name: `Prueba ${index + 1}`, original_name: `Prueba ${index + 1} Ida`, color: "#0088ff", corridor_width_m: 550,
    path: path.map(([lng, lat]) => [lng - 102.06, lat + 19.42]),
  })) }));
  await page.goto("/mapa?a=-102.060000,19.420000&b=-102.050000,19.439000");
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("TRANSBORDO SELECCIONADO", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Compartir transbordo" })).toHaveCount(1);
  await panel.locator("summary").click();
  await panel.getByRole("button", { name: "Usar Prueba 3 como ruta recomendada", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Iniciar viaje en Prueba 3", exact: true })).toBeVisible();
  await expect(panel.getByText("¿Te sirvió esta ruta?", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Seleccionar transbordo de Prueba 1 a Prueba 2", exact: true }).click();
  await expect(panel.getByText("TRANSBORDO SELECCIONADO", { exact: true })).toBeVisible();
  await expect(panel.getByText("¿Te sirvió este transbordo?", { exact: true })).toBeVisible();
});

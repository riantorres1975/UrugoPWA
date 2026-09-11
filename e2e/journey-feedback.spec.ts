import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    Object.defineProperty(navigator, "share", { configurable: true, value: async () => undefined });
  });
});

test("ruta directa: una acción de compartir y reporte sin salir del mapa", async ({ page }, testInfo) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/community/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: /Compartir/ })).toHaveCount(1);
  await expect(panel.getByText("¿Te sirvió esta ruta?", { exact: true })).toBeVisible();
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("ruta-directa.png") });
  await panel.getByRole("button", { name: "Sí", exact: true }).click();
  await expect(panel.getByText("Gracias por tu opinión.")).toBeVisible();
  await panel.getByRole("button", { name: "Reportar un problema", exact: true }).click();
  await expect(panel.getByLabel("¿En qué ruta ocurrió?")).toHaveCount(0);
  await panel.getByLabel("Cuéntanos un poco más").fill("La ruta ahora pasa por otra calle cerca del mercado.");
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByText("Reporte enviado. Gracias por ayudarnos.")).toBeVisible();
  expect(submitted).toMatchObject({ sourcePath: "/mapa", reportType: "route_changed" });
  expect(submitted?.["routeKey"]).toBeTruthy();
  expect(submitted?.["routeName"]).toBeTruthy();
  await expect(page).toHaveURL(/\/mapa\?/);
  expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
});

test("transbordo: califica, elige tramo y reintenta un reporte sin perder el texto", async ({ page, context }, testInfo) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route("**/api/community/reports", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill(submissions.length === 1
      ? { status: 503, json: { error: "Servicio no disponible. Intenta de nuevo." } }
      : { status: 201, json: { ok: true } });
  });
  await context.setGeolocation({ longitude: -102.025, latitude: 19.405 });
  await context.grantPermissions(["geolocation"]);
  await page.goto("/mapa?b=-102.08,19.42");
  const option = page.locator('button[aria-label^="Seleccionar transbordo de"]:visible').first();
  await expect(option).toBeVisible();
  const [routeA, routeB] = (await option.getAttribute("aria-label"))!.replace("Seleccionar transbordo de ", "").split(" a ");
  await option.click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "TRANSBORDO SELECCIONADO" });
  await expect(panel.getByRole("button", { name: "Compartir transbordo" })).toHaveCount(1);
  await expect(panel.getByRole("button", { name: "Limpiar ruta seleccionada" })).toHaveCount(1);
  await expect(panel.getByText("¿Te sirvió este transbordo?", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Ver dónde cambiar" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("application", { name: /Mapa interactivo/ })).toBeVisible();
  await page.waitForTimeout(850);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("punto-transbordo.png") });
  await page.getByRole("button", { name: "Ver resultado de ruta" }).click();
  await expect(panel.getByRole("list", { name: "Tramos del viaje" })).toContainText(routeA);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("transbordo.png") });
  await panel.getByRole("button", { name: "No", exact: true }).click();
  await expect(panel.getByText("Gracias por tu opinión.")).toBeVisible();
  await expect(panel.getByRole("heading", { name: "¿Qué salió mal?" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Enviar reporte", exact: true })).toBeDisabled();
  await panel.getByLabel("¿En qué ruta ocurrió?").selectOption(routeB);
  await panel.getByRole("radio", { name: "El horario es incorrecto" }).check();
  const description = "La segunda ruta termina su servicio antes del horario indicado.";
  await panel.getByLabel("Cuéntanos un poco más").fill(description);
  await panel.getByRole("button", { name: "Ocultar reporte" }).click();
  await panel.getByRole("button", { name: "Reportar un problema", exact: true }).click();
  await expect(panel.getByLabel("Cuéntanos un poco más")).toHaveValue(description);
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Servicio no disponible");
  await expect(panel.getByLabel("Cuéntanos un poco más")).toHaveValue(description);
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByText("Reporte enviado. Gracias por ayudarnos.")).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toMatchObject({ routeName: routeB, reportType: "schedule_changed", sourcePath: "/mapa", place: `Transbordo: ${routeA} → ${routeB}` });
  expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("button", { name: "Compartir transbordo" })).toHaveCount(1);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("transbordo-escritorio.png") });
});

test("una opinión negativa permite enviar un motivo sin escribir detalles", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/community/reports", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  const primary = await panel.getByRole("button", { name: /Iniciar viaje en/ }).boundingBox();
  const secondary = await panel.getByRole("button", { name: /Compartir/ }).boundingBox();
  expect(primary!.y).toBeLessThan(secondary!.y);
  await panel.getByRole("button", { name: "No", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "¿Qué salió mal?" })).toBeVisible();
  await panel.getByRole("radio", { name: "La ruta ya no circula" }).check();
  await expect(panel.getByLabel("Cuéntanos un poco más")).toHaveValue("");
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByText("Reporte enviado. Gracias por ayudarnos.")).toBeVisible();
  expect(submitted).toMatchObject({ reportType: "route_inactive", description: "Problema indicado durante el viaje: La ruta ya no circula." });
});

test("un reporte sin conexión sobrevive a recargar y se envía al recuperarla", async ({ page, context }) => {
  const submissions: unknown[] = [];
  await page.route("**/api/community/reports", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { ok: true } });
  });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await panel.getByRole("button", { name: "Reportar un problema", exact: true }).click();
  const description = "La ruta ahora entra por la calle junto al mercado.";
  await panel.getByLabel("Cuéntanos un poco más").fill(description);
  await context.setOffline(true);
  await panel.getByRole("button", { name: "Guardar reporte pendiente" }).click();
  await expect(panel.getByText("Reporte guardado en este dispositivo.")).toBeVisible();
  expect(submissions).toHaveLength(0);
  await panel.getByRole("button", { name: "Cerrar panel" }).click();
  const pending = page.getByRole("complementary", { name: "Reportes pendientes" });
  await expect(pending.getByRole("button", { name: "Enviar pendientes" })).toBeDisabled();
  await context.setOffline(false);
  await page.goto("/mapa");
  await expect(pending).toContainText("1 reporte pendiente");
  await pending.getByRole("button", { name: "Enviar pendientes" }).click();
  await expect(pending).toContainText("Reportes enviados. Gracias por ayudarnos.");
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ description, sourcePath: "/mapa" });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("urugo:report-outbox:v1") ?? "[]"))).toEqual([]);
});

test("muestra la fecha real de verificación y conserva la cabecera en 320 px", async ({ page }, testInfo) => {
  await page.route("**/api/rutas-polyline", async (route) => {
    const response = await route.fetch();
    const routes = await response.json() as Record<string, unknown>[];
    await route.fulfill({ json: routes.map((item) => ({ ...item, last_verified_at: "2026-09-10T18:00:00Z" })) });
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await expect(panel.getByLabel("Verificación de las rutas")).toContainText(/10 sep(?:t)? 2026/);
  await panel.getByRole("button", { name: "Cerrar panel" }).click();
  await expect(page.getByRole("link", { name: "Abrir guía de uso" })).toContainText("Guía");
  const mode = page.getByRole("button", { name: "Cambiar a modo todas destacadas" });
  await expect(mode).toContainText("Resaltar");
  await mode.click();
  await expect(page.getByRole("button", { name: "Cambiar a modo todas visibles" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ animations: "disabled", scale: "css", path: testInfo.outputPath("cabecera-320.png") });
});

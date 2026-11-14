import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function prepare(page: Page) {
  // Real Mapbox canvas and gestures with local geometry/background. No paid tile requests.
  await page.route("https://api.mapbox.com/styles/v1/**", route => route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e5e9df" } }] } }));
  await page.route("https://api.mapbox.com/map-sessions/v1**", route => route.fulfill({ json: {} }));
  await page.route("https://events.mapbox.com/**", route => route.fulfill({ status: 204 }));
  await page.route("https://api.mapbox.com/search/**", route => route.fulfill({ json: { features: [] } }));
  await page.route("**/api/v1/routes/*/geometry", route => route.fulfill({ json: { directions: [
    { id: 17, label: "Ida", path: [[-102.07, 19.42], [-102.06, 19.42], [-102.06, 19.43]] },
    { id: 18, label: "Vuelta", path: [[-102.06, 19.43], [-102.061, 19.421], [-102.07, 19.42]] },
  ] } }));
}
async function moveMap(page: Page) {
  const canvas = page.locator(".proposal-canvas canvas");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  // Mapbox's keyboard pan animates; wait for its camera to settle before reading its center.
  await page.waitForTimeout(400);
}

for (const width of [320, 390, 1280]) {
  test(`marca y corrige un tramo sin puntos accidentales a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await prepare(page);
    let submitted: Record<string, unknown> | undefined;
    await page.route("**/api/community/reports", route => {
      submitted = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { ok: true } });
    });
    await page.goto("/reportar-error?clave=ruta-17-purhepechas");
    const launcher = page.getByRole("button", { name: /Marcar calles en el mapa/ });
    await launcher.click();
    const editor = page.getByRole("dialog", { name: "¿Por dónde pasa el camión?" });
    const add = editor.getByRole("button", { name: "Agregar punto", exact: true });
    await expect(add).toBeEnabled();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    if (width === 390) {
      const box = (await page.locator(".proposal-canvas canvas").boundingBox())!;
      const session = await page.context().newCDPSession(page);
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.touchscreen.tap(x, y);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 5; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - i * 12, y: y + i * 4 }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(0);
    }
    await page.locator(".proposal-canvas canvas").click();
    await moveMap(page);
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(0);
    await add.click();
    await expect(editor.getByRole("button", { name: "Editar punto 1", exact: true })).toBeVisible();
    await add.click();
    await expect(editor.getByRole("status")).toContainText("Mueve el mapa hasta la siguiente esquina");
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(1);
    await moveMap(page); await add.click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(2);
    await editor.getByRole("button", { name: "Deshacer último cambio" }).click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(1);
    await editor.getByRole("button", { name: "Rehacer último cambio" }).click();
    await editor.getByRole("button", { name: "Editar punto 1", exact: true }).click();
    await moveMap(page);
    await editor.getByRole("button", { name: "Mover punto 1", exact: true }).click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(2);
    await editor.getByRole("button", { name: "Editar punto 1", exact: true }).click();
    await editor.getByRole("button", { name: "Insertar después", exact: true }).click();
    await moveMap(page);
    await editor.getByRole("button", { name: "Insertar punto", exact: true }).click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(3);
    await editor.getByRole("button", { name: "Editar punto 2", exact: true }).click();
    await editor.getByRole("button", { name: "Quitar", exact: true }).click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(2);
    await editor.getByRole("button", { name: "Vuelta", exact: true }).click();
    await editor.getByRole("button", { name: "Ocultar ruta publicada" }).click();
    await expect(editor.getByRole("button", { name: "Mostrar ruta publicada" })).toBeVisible();
    await editor.getByRole("button", { name: "Borrar todo el tramo" }).click();
    await editor.getByRole("button", { name: "Conservar", exact: true }).click();
    expect(await editor.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(false);
    const issues = await new AxeBuilder({ page }).include(".proposal-editor").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(issues.violations).toEqual([]);
    await editor.getByRole("button", { name: "Usar este tramo · 2 puntos" }).click();
    const review = page.getByRole("button", { name: /Revisar mi tramo/ });
    await expect(review).toBeFocused();
    await expect(review).toContainText("Vuelta");
    await review.click();
    await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(2);
    await expect(editor.getByRole("button", { name: "Vuelta", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Enviar reporte", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gracias, recibimos tu reporte." })).toBeVisible();
    expect(submitted?.proposedPath).toHaveLength(2);
    expect(submitted?.expectedResult).toContain("Vuelta");
    expect(submitted?.description).toContain("tramo marcado");
    expect(submitted?.routeKey).toBe("ruta-17-purhepechas");
  });
}

test("un mapa no disponible permite volver y enviar una descripción", async ({ page }) => {
  await prepare(page);
  await page.route("**/api/v1/routes/*/geometry", route => route.fulfill({ status: 503 }));
  await page.route("**/api/community/reports", route => route.fulfill({ status: 201, json: { ok: true } }));
  await page.goto("/reportar-error?clave=ruta-17-purhepechas");
  await page.getByRole("button", { name: /Marcar calles en el mapa/ }).click();
  await page.getByRole("button", { name: "Volver y describir las calles" }).click();
  await page.getByLabel("Detalle del reporte").fill("Ahora pasa por la calle Veracruzana y baja hasta el mercado.");
  await page.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gracias, recibimos tu reporte." })).toBeVisible();
});

test("no permite dibujar sobre un fondo de calles que fue rechazado", async ({ page }) => {
  await prepare(page);
  await page.route("https://api.mapbox.com/styles/v1/**", route => route.fulfill({ status: 403, json: { message: "Forbidden" } }));
  await page.goto("/reportar-error?clave=ruta-17-purhepechas");
  await page.getByRole("button", { name: /Marcar calles en el mapa/ }).click();
  const editor = page.getByRole("dialog", { name: "¿Por dónde pasa el camión?" });
  await expect(editor.getByRole("button", { name: "Volver y describir las calles" })).toBeVisible();
  await expect(editor.getByRole("button", { name: "Agregar punto", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Volver y describir las calles" }).click();
  await expect(page.getByLabel("Detalle del reporte")).toBeVisible();
});

test("adjunta un tramo desde la PWA y regresa al reporte del viaje", async ({ page }) => {
  await prepare(page);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  let submitted: Record<string, unknown> | undefined;
  let attempts = 0;
  await page.route("**/api/community/reports", route => { submitted = route.request().postDataJSON(); return route.fulfill(++attempts === 1 ? { status: 503, json: { error: "Servicio temporalmente no disponible" } } : { status: 201, json: { ok: true } }); });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await panel.getByRole("button", { name: "Reportar un problema", exact: true }).click();
  await panel.getByRole("button", { name: /Marcar calles en el mapa/ }).click();
  const editor = page.getByRole("dialog", { name: "¿Por dónde pasa el camión?" });
  const add = editor.getByRole("button", { name: "Agregar punto", exact: true });
  await expect(add).toBeEnabled();
  await add.click(); await moveMap(page); await add.click();
  await page.keyboard.press("Tab");
  expect(await editor.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await panel.getByRole("button", { name: /Revisar mi tramo/ }).click();
  await editor.getByRole("button", { name: "Usar este tramo · 2 puntos" }).click();
  await expect(panel.getByRole("button", { name: /Revisar mi tramo/ })).toBeFocused();
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("temporalmente no disponible");
  await expect(panel.getByRole("button", { name: /Revisar mi tramo/ })).toContainText("2 puntos");
  await panel.getByRole("button", { name: "Enviar reporte", exact: true }).click();
  await expect(panel.getByText("Reporte enviado. Gracias por ayudarnos.")).toBeVisible();
  expect(submitted?.proposedPath).toHaveLength(2);
  expect(submitted?.sourcePath).toBe("/mapa");
  await expect(page).toHaveURL(/\/mapa\?/);
});

test("el buscador se adapta al teclado móvil y buscar no envía el reporte", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await prepare(page);
  let submissions = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/community/reports") submissions++; });
  await page.goto("/reportar-error?clave=ruta-17-purhepechas");
  await page.getByRole("button", { name: /Marcar calles en el mapa/ }).click();
  const editor = page.getByRole("dialog", { name: "¿Por dónde pasa el camión?" });
  await expect(editor.getByRole("button", { name: "Agregar punto", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, value: 380 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  expect((await editor.boundingBox())!.height).toBeLessThanOrEqual(380);
  await editor.getByRole("textbox", { name: "Buscar calle o lugar en el mapa" }).fill("Centro");
  await page.keyboard.press("Enter");
  await editor.locator(".proposal-results").getByRole("button", { name: "Centro", exact: true }).click();
  expect(submissions).toBe(0);
  await expect(editor.getByRole("button", { name: /Editar punto/ })).toHaveCount(0);
  await editor.getByRole("button", { name: "Volver al reporte" }).click();
  await expect(page.getByLabel("Elige una ruta")).toHaveValue("ruta-17-purhepechas");
});

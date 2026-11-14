import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.mapbox.com/styles/v1/**", route => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }));
  await page.route("https://events.mapbox.com/**", route => route.fulfill({ status: 204 }));
  await page.route("https://api.mapbox.com/map-sessions/v1**", route => route.fulfill({ json: {} }));
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 720 });
  });
  await page.setViewportSize({ width: 390, height: 844 });
});

async function expectControlsInside(page: import("@playwright/test").Page, height: number) {
  for (const name of ["Abrir viajes sin conexión", "Abrir asistente de rutas", /Rutas \d+, ver rutas disponibles/]) {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeVisible();
    await expect.poll(async () => (await button.boundingBox())!.y + (await button.boundingBox())!.height).toBeLessThanOrEqual(height - 8);
    await expect(button).toBeInViewport({ ratio: 1 });
  }
}

test("los controles caben desde el primer arranque sin abrir el teclado", async ({ page }) => {
  await page.goto("/mapa");
  await expectControlsInside(page, 720);
  await expect(page.getByRole("combobox").first()).not.toBeFocused();
  await expect.poll(async () => (await page.locator("main.map-viewport").boundingBox())!.height).toBe(720);
  await page.screenshot({ path: test.info().outputPath("primer-arranque.png") });
  await page.getByRole("button", { name: /Rutas \d+, ver rutas disponibles/ }).click();
  const sheet = page.getByRole("dialog", { name: "Selecciona una ruta" });
  await expect(sheet).toBeVisible();
  await expect.poll(async () => { const bounds = (await sheet.boundingBox())!; return bounds.y + bounds.height; }).toBeLessThanOrEqual(721);
  await sheet.getByRole("button", { name: "Cerrar panel", exact: true }).click();
});

test("sincroniza el teclado, la reapertura y la orientación sin esconder los botones", async ({ page }) => {
  await page.goto("/mapa");
  await expectControlsInside(page, 720);
  const search = page.getByRole("combobox").first();
  await search.focus();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 400 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expectControlsInside(page, 400);
  await search.evaluate(el => (el as HTMLInputElement).blur());
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 720 });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expectControlsInside(page, 720);
  // Android can settle the installed window while it was in the background.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 680 });
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await expectControlsInside(page, 680);
  await page.setViewportSize({ width: 780, height: 390 });
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 360 });
    window.dispatchEvent(new Event("orientationchange"));
  });
  await expectControlsInside(page, 360);
  const canvas = page.locator("canvas.mapboxgl-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(async () => Math.round((await canvas.boundingBox())!.height)).toBe(360);
});

test("corrige una altura inicial que se estabiliza sin emitir resize", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 844 });
    setTimeout(() => Object.defineProperty(window.visualViewport!, "height", { configurable: true, writable: true, value: 690 }), 250);
  });
  await page.goto("/mapa");
  await expectControlsInside(page, 690);
});

import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.top === window) localStorage.setItem("rutas-uru-onboarded", "1");
  });
});

test("contrae el plan y permite editar los puntos en un móvil alto", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await expect(page.getByRole("button", { name: "Ver resultado de ruta" })).toContainText("1 camión");
  await expect(page.getByRole("combobox", { name: "Buscar destino" })).toBeHidden();
  const summary = page.getByRole("button", { name: "Ajustar origen y destino manualmente" });
  await expect(summary).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mapa-compacto.png") });
  await summary.click();
  await expect(page.getByRole("button", { name: "Destino marcado, toca para cambiar" })).toBeVisible();
  await page.getByRole("button", { name: "Colapsar origen y destino" }).click();
  await expect(summary).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test.describe("fichas sin conexión", () => {
test.use({ serviceWorkers: "allow" });
test("guarda una ficha dentro de la app, permite abrirla y quitarla", async ({ page, context }, testInfo) => {
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(preview).toContainText("1 camión");
  await preview.click();
  await page.getByRole("button", { name: "Guardar en la app", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Viaje guardado en este dispositivo" })).toBeVisible();
  await page.getByRole("button", { name: "Mis viajes guardados" }).click();
  const library = page.getByRole("dialog", { name: "Viajes sin conexión" });
  await expect(library).toContainText("Guardado el");
  await page.screenshot({ path: testInfo.outputPath("viajes-guardados.png") });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    }
  });
  await page.goto("/mapa?guardados=1");
  await expect(library).toContainText("Guardado el");
  await expect.poll(() => page.evaluate(async () => {
    const scripts = [...document.scripts].filter((script) => !script.noModule).map((script) => script.src)
      .filter((src) => src.startsWith(`${location.origin}/_next/static/`));
    return (await Promise.all(scripts.map((src) => caches.match(src)))).every(Boolean);
  })).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(library).toContainText("Guardado el");
  await library.getByRole("button", { name: "Ver indicaciones" }).click();
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Tu viaje con UruGo" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("ficha-sin-conexion.png") });
  await library.getByRole("button", { name: "Volver a mis viajes" }).click();
  await library.getByRole("button", { name: /^Quitar viaje/ }).click();
  await expect(library).toContainText("Aún no tienes viajes guardados");
  await context.setOffline(false);
});
});

test("prioriza Tu día cuando hay un destino guardado y aclara las distancias", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("urugo-saved-places", JSON.stringify({
    casa: { label: "Centro Histórico", center: [-102.062, 19.42], source: "local" },
  })));
  await page.goto("/");
  const everyday = page.locator(".everyday");
  await expect(everyday).toHaveAttribute("data-personalized", "true");
  await expect(everyday.locator(":scope > :first-child")).toHaveAttribute("id", "tu-dia");
  await expect(page.locator("#destinos")).toContainText("min del destino");
  await expect(page.locator("#tu-dia").getByRole("link", { name: /Viajes sin conexión/ })).toHaveAttribute("href", "/mapa?guardados=1");
  await everyday.screenshot({ path: testInfo.outputPath("inicio-personalizado.png") });
});

test("la biblioteca también se puede abrir y cerrar desde el panel de escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto("/mapa");
  await page.getByRole("button", { name: "Viajes sin conexión", exact: true }).click();
  const library = page.getByRole("dialog", { name: "Viajes sin conexión" });
  await expect(library).toBeVisible();
  await expect(library).toContainText("Aún no tienes viajes guardados");
  await page.keyboard.press("Escape");
  await expect(library).toBeHidden();
});

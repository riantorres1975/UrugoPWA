import { expect, test } from "./fixtures";

// Playwright's service-worker blocking script cannot run inside the sandboxed
// offline document. Fresh browser contexts still isolate these tests.
test.use({ serviceWorkers: "allow" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window.top === window) localStorage.setItem("rutas-uru-onboarded", "1"); });
});

test("explica la recomendación antes de iniciar y avisa de cambios sin borrar la ficha", async ({ page }, testInfo) => {
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(preview).toContainText(/opciones|Caminas|Esta opción|Evitas|Tardas/);
  await preview.click();
  const explanation = page.getByLabel("Comparación de esta opción");
  await expect(explanation).toContainText("Por qué aparece esta opción");
  const start = page.getByRole("button", { name: /^Iniciar viaje/ });
  await expect(start).toBeVisible();
  expect(await explanation.evaluate((element) => !!(element.compareDocumentPosition(
    document.querySelector('button[aria-label^="Iniciar viaje"]')!,
  ) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await page.getByRole("button", { name: "Guardar en la app", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Viaje guardado en este dispositivo" })).toBeVisible();
  const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem("urugo-offline-journeys-v1")!)[0].snapshot);
  expect(snapshot.routes).toHaveLength(1);
  await page.route("**/api/journeys/freshness", (route) => route.fulfill({ json: {
    source: "supabase", routes: snapshot.routes.map((r: { id: number }) => ({ id: r.id, signature: "f".repeat(64) })),
    fares: { bus: 14, teleferico: 12 },
  } }));
  await page.getByRole("button", { name: "Mis viajes guardados" }).click();
  const library = page.getByRole("dialog", { name: "Viajes sin conexión" });
  await expect(library).toContainText("La tarifa cambió de $12 a $14");
  await expect(library).toContainText("El recorrido o sus referencias cambiaron");
  await library.getByRole("button", { name: "Ver indicaciones" }).click();
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Tu viaje con UruGo" })).toBeVisible();
  await expect(library.getByRole("link", { name: "Volver a planear este viaje" })).toHaveAttribute("href", /^\/mapa\?a=.*&b=/);
  await page.screenshot({ path: testInfo.outputPath("ficha-con-cambios.png") });
  await library.getByRole("link", { name: "Volver a planear este viaje" }).click();
  await expect(preview).toContainText("1 camión");
  await expect(library).toBeHidden();
});

test("las fichas antiguas siguen abriendo y no se presentan como verificadas", async ({ page }) => {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem("urugo-offline-journeys-v1", JSON.stringify([{
      id: "legacy", title: "Viaje antiguo", savedAt: Date.now(), html: "<!doctype html><h1>Mi ficha anterior</h1>",
    }]));
  });
  await page.route("**/api/journeys/freshness", (route) => route.fulfill({ status: 503 }));
  await page.goto("/mapa?guardados=1");
  const library = page.getByRole("dialog", { name: "Viajes sin conexión" });
  await expect(library).toContainText("Esta ficha antigua no permite comprobar cambios");
  await expect(library).not.toContainText("sin cambios en el catálogo");
  await library.getByRole("button", { name: "Ver indicaciones" }).click();
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Mi ficha anterior" })).toBeVisible();
});

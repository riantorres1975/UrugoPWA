import { expect, test } from "./fixtures";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";

test("Tu día reúne favoritas, destinos, regreso y reportes sin exponer su contenido", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    localStorage.setItem("urugo-favorite-routes", JSON.stringify(["Ruta 26"]));
    localStorage.setItem("urugo-recent-trips", JSON.stringify([{ origin: [-102.08,19.42], destination: [-102.06,19.43], destinationLabel: "Centro", routeName: "Ruta 26", savedAt: Date.now() }]));
    localStorage.setItem("urugo-report-receipts-v1", JSON.stringify([{ token: "46ed4c46-a5d7-4988-80d2-b9b5fdc96765." + "a".repeat(32), label: "Ruta 26", savedAt: Date.now() }]));
  });
  await page.route("**/api/v1/routes/*/community-status", (r) => r.fulfill({ json: { state: "review_suggested", observedAt: new Date().toISOString() } }));
  await page.route("**/api/community/reports/status", (r) => r.fulfill({ json: [{ id: "46ed4c46-a5d7-4988-80d2-b9b5fdc96765", status: "approved" }] }));
  await page.goto("/");
  const day = page.getByRole("region", { name: "Tu día", exact: true });
  await expect(day.getByRole("link", { name: "★ Ruta 26" })).toBeVisible();
  const back = day.getByRole("link", { name: "Planear regreso desde Centro" });
  const params = new URL((await back.getAttribute("href"))!, "https://urugo.app").searchParams;
  expect(params.get("a")).toBe("-102.06,19.43"); expect(params.get("b")).toBe("-102.08,19.42"); expect(params.has("r")).toBe(false);
  await expect(day).toContainText("Avisos de tus favoritas");
  await day.locator("summary").click(); await day.getByRole("button", { name: "Actualizar estados" }).click();
  await expect(day).toContainText("Aprobado");
  await expect(day).toContainText("no confirma que el mapa ya se actualizó");
  const accessibility = await new AxeBuilder({ page }).include("#tu-dia").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("tu-dia-360.png"), animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await day.getByRole("button", { name: /Quitar del historial/ }).click();
  await expect(day.locator("summary")).toHaveCount(0);
});

test("no muestra avisos vencidos y permite retomar un viaje pendiente", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("urugo-favorite-routes", JSON.stringify(["Ruta 26"]));
    localStorage.setItem("urugo-active-trip-v1", JSON.stringify({ version: 1, savedAt: Date.now(), journey: { kind: "direct", routeId: 1, routeName: "Ruta 26", segment: [[-102.08,19.42],[-102.06,19.42]], destination: [-102.06,19.43] }, tracking: { progress: null, offRouteReadings: 0, arrivalReadings: 0 } }));
  });
  await page.route("**/api/v1/routes/*/community-status", (r) => r.fulfill({ json: { state: "review_suggested", observedAt: new Date(Date.now() - 8 * 86400_000).toISOString() } }));
  await page.goto("/");
  const day = page.getByRole("region", { name: "Tu día", exact: true });
  await expect(day.getByRole("link", { name: /Continuar viaje pendiente/ })).toHaveAttribute("href", "/mapa");
  await expect(day.getByText("Avisos de tus favoritas")).toHaveCount(0);
});

test("descarga una ficha que abre sin internet y recalcula el regreso", async ({ page, context }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  const path = [[-102.08,19.42],[-102.07,19.42],[-102.06,19.42]];
  await page.route("**/api/rutas-polyline", (r) => r.fulfill({ json: [
    { id: 1, name: "Ruta ida", original_name: "Ruta ida Ida", color: "#0088ff", corridor_width_m: 400, path },
    { id: 2, name: "Ruta vuelta", original_name: "Ruta vuelta Vuelta", color: "#0088ff", corridor_width_m: 400, path: [...path].reverse() },
  ] }));
  await page.goto("/mapa?a=-102.078,19.42&b=-102.062,19.42");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("Ruta ida"); await preview.click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Guardar ficha sin conexión" }).click();
  const download = await downloadEvent;
  const file = testInfo.outputPath("mi-viaje.html"); await download.saveAs(file);
  await page.getByRole("button", { name: "Planear regreso", exact: true }).click();
  await expect(page.getByText("Ruta vuelta", { exact: true }).first()).toBeVisible();
  await context.setOffline(true);
  await page.goto(pathToFileURL(file).href);
  await expect(page.getByRole("heading", { name: "Tu viaje con UruGo" })).toBeVisible();
  await expect(page.locator("ol")).toContainText("Sube a Ruta ida");
  await expect(page.locator("ol")).toContainText("Baja de Ruta ida");
  await expect(page.locator("svg")).toBeVisible();
});

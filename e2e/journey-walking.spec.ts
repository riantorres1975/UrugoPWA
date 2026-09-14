import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.route("**/api/rutas-polyline", (route) => route.fulfill({ json: [
    { id: 1, name: "Acceso cercano", original_name: "Acceso cercano Ida", color: "#00aa00", corridor_width_m: 550, path: [[-102.06, 19.421], [-102.04, 19.421]] },
    { id: 2, name: "Acceso por calles", original_name: "Acceso por calles Ida", color: "#0088ff", corridor_width_m: 550, path: [[-102.06, 19.422], [-102.04, 19.422]] },
  ] }));
});

test("reordena con la caminata por calles, conserva la caché y muestra el trazado", async ({ page }, testInfo) => {
  let requests = 0;
  await page.route("https://api.mapbox.com/directions/v5/mapbox/walking/**", async (route) => {
    requests++;
    const coordinates = new URL(route.request().url()).pathname.split("/").at(-1)!.split(";").map((part) => part.split(",").map(Number));
    const [from, to] = coordinates;
    const detour = from[1] === 19.421 || to[1] === 19.421;
    const middle = [from[0] + (detour ? 0.0025 : 0.0002), (from[1] + to[1]) / 2];
    await route.fulfill({ json: { code: "Ok", routes: [{ distance: detour ? 700 : 260, duration: detour ? 600 : 208, geometry: { type: "LineString", coordinates: [from, middle, to] } }] } });
  });
  await page.goto("/mapa?a=-102.060000,19.420000&b=-102.040000,19.420000");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("Acceso por calles", { timeout: 15000 });
  await preview.click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("520 m a pie en total");
  await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("Caminata calculada por calles");
  const count = requests;
  await panel.getByRole("button", { name: "Equilibrada", exact: true }).click();
  await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("Caminata calculada por calles");
  expect(requests).toBe(count);
  await page.screenshot({ path: testInfo.outputPath("caminata-por-calles.png"), scale: "css" });
  await panel.getByRole("button", { name: /Ver Acceso por calles en el mapa/ }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole("application", { name: /Mapa interactivo/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("trazado-peatonal.png"), scale: "css" });
});

test("un resultado tardío respeta la alternativa elegida por el usuario", async ({ page }) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("https://api.mapbox.com/directions/v5/mapbox/walking/**", async (route) => {
    await held;
    const coordinates = new URL(route.request().url()).pathname.split("/").at(-1)!.split(";").map((part) => part.split(",").map(Number));
    await route.fulfill({ json: { code: "Ok", routes: [{ distance: 300, duration: 240, geometry: { type: "LineString", coordinates } }] } }).catch(() => undefined);
  });
  await page.goto("/mapa?a=-102.060000,19.420000&b=-102.040000,19.420000");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.locator("summary").click();
  await panel.getByRole("button", { name: "Usar Acceso por calles como ruta recomendada", exact: true }).click();
  release();
  await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("Caminata calculada por calles", { timeout: 15000 });
  await expect(panel.getByRole("button", { name: "Iniciar viaje en Acceso por calles", exact: true })).toBeVisible();
});

test("mantiene opciones aproximadas cuando no se puede consultar al proveedor", async ({ page }) => {
  await page.goto("/mapa?a=-102.060000,19.420000&b=-102.040000,19.420000");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByLabel("Caminata del viaje").first()).toContainText("no pudimos comprobar", { timeout: 15000 });
  await expect(panel.getByRole("button", { name: "Iniciar viaje en Acceso cercano", exact: true })).toBeVisible();
});

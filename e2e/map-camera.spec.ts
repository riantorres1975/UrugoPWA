import path from "node:path";
import type mapboxgl from "mapbox-gl";
import { getSafeCameraPadding } from "../lib/map-camera";
import { expect, test } from "./fixtures";

test("el teclado no aleja el encuadre hasta mostrar todo el país", async ({ page }) => {
  await page.setContent('<div id="map" style="width:400px;height:800px"></div>');
  await page.addScriptTag({ path: path.resolve("node_modules/mapbox-gl/dist/mapbox-gl.js") });
  const sizes = [800, 425, 421, 420, 360, 800].map((height) => ({
    height,
    padding: getSafeCameraPadding(400, height, { top: 220, bottom: 200, left: 48, right: 48 }),
  }));
  const results = await page.evaluate(async (sizes) => {
    const engine = (window as unknown as { mapboxgl: typeof mapboxgl }).mapboxgl;
    const map = new engine.Map({
      container: "map",
      style: { version: 8, sources: {}, layers: [] },
      center: [-102.05, 19.42],
      zoom: 12,
      performanceMetricsCollection: false,
    });
    await new Promise<void>((resolve) => map.once("load", () => resolve()));
    try {
      return sizes.map(({ height, padding }) => {
        map.getContainer().style.height = `${height}px`;
        map.resize();
        map.fitBounds([[-102.025, 19.405], [-102.0747, 19.47727]], {
          padding, retainPadding: false, maxZoom: 15, duration: 0,
        });
        return {
          zoom: map.getZoom(),
          padding: map.getPadding(),
          pointsVisible: [[-102.025, 19.405], [-102.0747, 19.47727]].every(([lng, lat]) => {
            const point = map.project([lng, lat]);
            return point.x >= 0 && point.x <= 400 && point.y >= 0 && point.y <= height;
          }),
        };
      });
    } finally {
      map.remove();
    }
  }, sizes);
  for (const result of results) {
    expect(result.zoom).toBeGreaterThan(10);
    expect(result.zoom).toBeLessThanOrEqual(15);
    expect(result.pointsVisible).toBe(true);
    expect(result.padding).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  }
});

test("elegir un destino reciente cierra el teclado y conserva la búsqueda", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    localStorage.setItem("urugo-recent-places", JSON.stringify([{
      label: "Instituto Tecnológico Superior de Uruapan (Tec Uruapan)",
      center: [-102.0747, 19.47727],
      source: "local",
    }]));
  });
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/mapa?a=-102.025000,19.405000");
  await expect(page.getByRole("application", { name: /Mapa interactivo/ })).toBeVisible({ timeout: 15_000 });
  const search = page.getByRole("combobox").first();
  await search.focus();
  await expect(page.getByRole("option", { name: /Instituto Tecnológico/ })).toBeVisible();
  await page.setViewportSize({ width: 400, height: 421 });
  await search.press("Enter");
  await expect(search).not.toBeFocused();
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(page.getByRole("dialog", { name: /opciones con transbordo/ })).toBeVisible();
  // Let the fit finish at keyboard height before restoring the full viewport.
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Cerrar panel", exact: true }).click();
  await page.setViewportSize({ width: 400, height: 800 });
  await expect.poll(async () => {
    const origin = await page.getByRole("img", { name: "Punto de origen", exact: true }).boundingBox();
    const destination = await page.getByRole("img", { name: "Punto de destino", exact: true }).boundingBox();
    return origin && destination ? Math.hypot(origin.x - destination.x, origin.y - destination.y) : 0;
  }).toBeGreaterThan(100);
  await expect(page.getByRole("button", { name: "Destino marcado, toca para cambiar" }))
    .toContainText("Instituto Tecnológico");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("urugo-recent-places")!)[0].center))
    .toEqual([-102.0747, 19.47727]);
});

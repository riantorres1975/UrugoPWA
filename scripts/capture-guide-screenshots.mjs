import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const outputDir = join(process.cwd(), "public", "guide");
const manifestScreenshotDir = join(process.cwd(), "public", "screenshots");
const readmeScreenshotDir = join(process.cwd(), "public", "readme");
await mkdir(outputDir, { recursive: true });
await mkdir(readmeScreenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  geolocation: { longitude: -102.06303, latitude: 19.42101 },
  permissions: ["geolocation"],
  colorScheme: "dark",
});
await context.addInitScript(() => {
  localStorage.setItem("rutas-uru-onboarded", "1");
  localStorage.setItem("voy-pwa-banner-dismissed", "1");
  localStorage.setItem("voy-pwa-ios-hint-dismissed", "1");
  localStorage.setItem("urugo:announcement:dismissed:fare-update-2026-08", "capture");
});

const page = await context.newPage();
const hideDevelopmentUi = () => page.addStyleTag({
  content: "nextjs-portal { display: none !important; }",
});
const capture = async (directory, name) => {
  await hideDevelopmentUi();
  return page.screenshot({
    path: join(directory, name),
    animations: "disabled",
  });
};
const captureWebp = async (directory, name) => {
  await hideDevelopmentUi();
  return page.screenshot({
    path: join(directory, name),
    type: "webp",
    quality: 82,
    animations: "disabled",
  });
};

await page.goto(`${baseUrl}/mapa`, { waitUntil: "domcontentloaded" });
const activateMap = page.getByRole("button", { name: "Activar mapa interactivo" });
if (await activateMap.isVisible().catch(() => false)) await activateMap.click();
await page.locator(".mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(1_200);
await capture(manifestScreenshotDir, "mapa-narrow.png");
await captureWebp(readmeScreenshotDir, "mapa-narrow.webp");

await page.locator('button[aria-label^="Rutas "]:visible').click();
await page.getByRole("dialog", { name: "Selecciona una ruta" }).waitFor({ state: "visible" });
await capture(manifestScreenshotDir, "rutas-narrow.png");
await captureWebp(readmeScreenshotDir, "rutas-narrow.webp");

await page.goto(
  `${baseUrl}/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870`,
  { waitUntil: "domcontentloaded" },
);
const resultDialog = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
await resultDialog.waitFor({ state: "visible", timeout: 15_000 });
await capture(outputDir, "resultado.png");
await captureWebp(readmeScreenshotDir, "resultado.webp");

const startTrip = resultDialog.locator('button[aria-label^="Iniciar viaje en"]');
if (await startTrip.isVisible().catch(() => false)) {
  await startTrip.click();
  await page.getByRole("region", { name: "Modo viaje" }).waitFor({ state: "visible" });
  await page.locator(".trip-map-marker--bus").waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  await capture(outputDir, "modo-viaje.png");
  await captureWebp(readmeScreenshotDir, "modo-viaje.webp");
}

await context.setGeolocation({ longitude: -102.02093, latitude: 19.396299 });
await page.goto(
  `${baseUrl}/mapa?a=-102.02093,19.396299&b=-102.0375379,19.4241787`,
  { waitUntil: "domcontentloaded" },
);
const telefericoResult = page.getByRole("dialog", { name: "Teleférico Uruapan", exact: true });
await telefericoResult.waitFor({ state: "visible", timeout: 15_000 });
await telefericoResult.locator('button[aria-label^="Iniciar viaje en"]').click();
await page.locator(".trip-map-marker--teleferico").waitFor({ state: "visible", timeout: 10_000 });
await page.waitForTimeout(500);
await capture(outputDir, "modo-viaje-teleferico.png");
await captureWebp(readmeScreenshotDir, "modo-viaje-teleferico.webp");

await context.setGeolocation({ longitude: -102.0375379, latitude: 19.4216787 });
await page.locator(".trip-map-marker--walking").waitFor({ state: "visible", timeout: 10_000 });
await page.getByRole("region", { name: "Modo viaje" }).getByText("ÚLTIMO TRAMO").waitFor({ state: "visible" });
await page.waitForTimeout(500);
await capture(outputDir, "modo-viaje-caminando.png");
await captureWebp(readmeScreenshotDir, "modo-viaje-caminando.webp");

await page.goto(`${baseUrl}/horarios`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: /Horarios de camiones/i }).waitFor({ state: "visible" });
await page.waitForTimeout(300);
await capture(outputDir, "horarios.png");
await captureWebp(readmeScreenshotDir, "horarios.webp");

await page.goto(`${baseUrl}/guia`, { waitUntil: "domcontentloaded" });
await page.locator("h1").first().waitFor({ state: "visible" });
await page.waitForTimeout(300);
await captureWebp(readmeScreenshotDir, "guia-narrow.webp");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.locator("h1").first().waitFor({ state: "visible" });
await page.waitForTimeout(300);
await captureWebp(readmeScreenshotDir, "inicio-wide.webp");

await page.goto(`${baseUrl}/mapa`, { waitUntil: "domcontentloaded" });
await page.locator(".mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(1_200);
await capture(manifestScreenshotDir, "mapa-wide.png");

await browser.close();
console.log("[screenshots] Guide, README, and manifest images updated");

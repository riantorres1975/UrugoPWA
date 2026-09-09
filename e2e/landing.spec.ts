import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function waitForLandingIntro(page: Page) {
  await page.locator(".animate-fade-up").evaluateAll(async (elements) => {
    await Promise.all(
      elements.flatMap((element) => element.getAnimations().map((animation) => animation.finished)),
    );
  });
}

test("el buscador de la portada abre sugerencias sin desplazar el contenido", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForLandingIntro(page);

  const popularLabel = page.getByText("Populares", { exact: true }).first();
  const popularBefore = await popularLabel.boundingBox();
  await page.getByRole("combobox", { name: "Buscar destino" }).focus();

  const suggestions = page.getByRole("listbox");

  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("Casa");
  await expect(suggestions).toContainText("Trabajo");
  await expect(suggestions).toHaveCSS("position", "absolute");

  const popularAfter = await popularLabel.boundingBox();

  expect(popularBefore).not.toBeNull();
  expect(popularAfter).not.toBeNull();
  expect(Math.abs(popularAfter!.y - popularBefore!.y)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 360, height: 800 });
  await page.reload();
  await waitForLandingIntro(page);
  const mobilePopular = page.getByText("Populares", { exact: true }).first();
  const mobileBefore = await mobilePopular.boundingBox();
  await page.getByRole("combobox", { name: "Buscar destino" }).focus();
  const mobileAfter = await mobilePopular.boundingBox();

  expect(mobileBefore).not.toBeNull();
  expect(mobileAfter).not.toBeNull();
  expect(Math.abs(mobileAfter!.y - mobileBefore!.y)).toBeLessThanOrEqual(1);
});

test("el simulador cambia de destino y abre el recorrido seleccionado", async ({ page }) => {
  await page.goto("/");

  const simulator = page.getByTestId("landing-trip-simulator");
  await expect(simulator).toBeVisible();
  await expect(simulator).toContainText("Central de Autobuses");
  await expect(simulator).toContainText("Ruta 11");

  await page.getByRole("button", { name: "Pausar ejemplos de viaje" }).click();
  await expect(page.getByRole("button", { name: "Reproducir ejemplos de viaje" })).toBeVisible();
  await page.getByRole("button", { name: "Reproducir ejemplos de viaje" }).click();

  await page.getByRole("button", { name: "Hospital Regional", exact: true }).click();

  await expect(simulator).toContainText("Estación Presidencia");
  await expect(simulator).toContainText("Dirección Hospital Regional");
  await expect(simulator).toContainText("$24 total");
  await expect(simulator.getByRole("link", { name: "Ver recorrido completo" })).toHaveAttribute(
    "href",
    "/mapa?destino=Hospital%20Regional",
  );
  await expect(page.locator(".mapboxgl-map")).toHaveCount(0);
});

test("el simulador animado cabe en una pantalla móvil", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  await expect(page.getByTestId("landing-trip-simulator")).toBeVisible();
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("la vista móvil usa capturas reales del modo viaje", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mercado Poniente", exact: true }).click();

  const simulator = page.getByTestId("landing-trip-simulator");
  const journeyImage = simulator.locator(".landing-journey-image");
  await expect(simulator.locator(".landing-map-stage > svg")).toHaveCount(0);
  await expect(journeyImage).toHaveAttribute("src", /modo-viaje-caminando/);
  await expect(simulator).toContainText("Último tramo a pie");

  await page.getByRole("button", { name: "Hospital Regional", exact: true }).click();
  await expect(journeyImage).toHaveAttribute("src", /modo-viaje-teleferico/);
  await expect(simulator).toContainText("Teleférico Uruapan");
  await expect(simulator.locator(".landing-map-pin")).toHaveCount(0);
});

test("las tarifas del transporte se muestran junto al medio de pago", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#transporte").getByRole("link", { name: /Camión urbano/ })).toContainText("$12 · Efectivo");
  await expect(page.locator("#transporte").getByRole("link", { name: /Teleférico Uruapan/ })).toContainText("$12 · Tarjeta");
});

test("el menú móvil se cierra con Escape y al tocar fuera", async ({ page }) => {
  await page.goto("/");

  const openButton = page.getByRole("button", { name: "Abrir navegación" });
  await openButton.click();
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();

  await openButton.click();
  await page.mouse.click(12, 420);
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();
});

test("las opciones de transporte usan iconos y caben en mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const busCard = page.getByRole("link", { name: /Camión urbano/ });
  const cableCarCard = page.getByRole("link", { name: /Teleférico Uruapan/ });

  await expect(busCard.locator(".lucide-bus-front")).toBeVisible();
  await expect(cableCarCard.locator(".lucide-cable-car")).toBeVisible();
  await expect(busCard).toContainText("$12 · Efectivo");
  await expect(cableCarCard).toContainText("$12 · Tarjeta");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("rutas cerca de mí localiza y abre las rutas próximas", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.06303, latitude: 19.42101 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/");

  await page.getByRole("link", { name: "Rutas cerca de mí" }).click();

  await expect(page).toHaveURL(/\/mapa\?cerca=1$/);
  const routeSheet = page.getByRole("dialog", { name: "Selecciona una ruta" });
  await expect(routeSheet).toBeVisible();
  await expect(routeSheet.getByText("Cercanas a ti", { exact: true })).toBeVisible();

  await routeSheet.getByRole("button", { name: "Cerrar panel" }).click();
  await expect(page.getByRole("button", { name: /rutas cerca de ti, ver rutas disponibles/ }))
    .toContainText("Cerca de ti");

  const dismissNearbyNotice = page.getByRole("button", { name: "Cerrar aviso" });
  const nearbyNotice = dismissNearbyNotice.locator("xpath=..");
  await expect(dismissNearbyNotice).toBeVisible();
  await expect(nearbyNotice).toHaveClass(/ov-panel/);
  await dismissNearbyNotice.click();
  await expect(page.getByText("No hay rutas cercanas a tu ubicación", { exact: true })).toHaveCount(0);
});

test("recupera el modo cercano si la navegación pierde el parámetro", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.06303, latitude: 19.42101 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    sessionStorage.setItem("urugo-nearby-routes-request", "1");
  });

  await page.goto("/mapa");

  const routeSheet = page.getByRole("dialog", { name: "Selecciona una ruta" });
  await expect(routeSheet).toBeVisible();
  await expect(routeSheet.getByText("Cercanas a ti", { exact: true })).toBeVisible();
});

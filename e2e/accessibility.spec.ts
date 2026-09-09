import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const pages = [
  { name: "inicio", path: "/" },
  { name: "mapa", path: "/mapa" },
  { name: "horarios", path: "/horarios" },
  { name: "directorio de rutas", path: "/rutas" },
  { name: "directorio de lugares", path: "/como-llegar" },
  { name: "guía de uso", path: "/guia" },
  { name: "metodología", path: "/acerca-de" },
  { name: "reporte de errores", path: "/reportar-error" },
  { name: "artículo del blog", path: "/blog/como-usar-el-teleferico-uruapan" },
] as const;

async function expectNoWcagViolations(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
}

for (const target of pages) {
  test(`${target.name} no tiene violaciones WCAG A o AA`, async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
    await context.setGeolocation({ latitude: 19.4204, longitude: -102.0622 });
    await context.grantPermissions(["geolocation"]);
    await page.goto(target.path);
    await expect(page.locator("main")).toBeVisible();

    await expectNoWcagViolations(page);
  });
}

test("el onboarding abierto no tiene violaciones WCAG A o AA", async ({ page }) => {
  await page.goto("/mapa");
  await expect(page.getByRole("dialog", { name: "Bienvenida a UruGo" })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("button", { name: "Empezar" })).toBeVisible();
  await expectNoWcagViolations(page);
});

test("el asistente abierto no tiene violaciones WCAG A o AA", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");
  await page.locator('button[aria-label="Abrir asistente de rutas"]:visible').click();
  await expect(page.getByRole("dialog", { name: "Asistente UruGo" })).toBeVisible();
  await page.getByRole("textbox", { name: "Escribe tu pregunta sobre rutas" }).fill("Centro");
  await expectNoWcagViolations(page);
});

test("el panel movil de rutas no tiene violaciones WCAG A o AA", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");
  await page.locator('button[aria-label^="Rutas "]:visible').click();
  await expect(page.getByRole("dialog", { name: "Selecciona una ruta" })).toBeVisible();
  await expectNoWcagViolations(page);
});

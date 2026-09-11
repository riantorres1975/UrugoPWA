import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
});

test("el resumen deja el mapa visible y permite enfocar y recuperar el viaje", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  const preview = page.getByRole("button", { name: "Ver resultado de ruta", exact: true });
  await expect(preview).toContainText("1 camión");
  await expect(preview).toContainText(/~\d+ min/);
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: "Ajustar origen y destino manualmente" }).click();
  await expect(page.getByText("Origen", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Destino", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("resumen-320.png") });
  await preview.click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await panel.getByRole("button", { name: "Sube aquí", exact: true }).click();
  await expect(panel).toBeHidden();
  const overview = page.getByRole("button", { name: "Ver todo el viaje", exact: true });
  await expect(overview).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: testInfo.outputPath("subida-320.png") });
  await overview.click();
  await expect(overview).toBeHidden();
  await page.waitForTimeout(900);
  const map = page.getByRole("application", { name: /Mapa interactivo/ });
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -500);
  await expect(overview).toBeVisible();
  await overview.click();
  await preview.click();
  await panel.getByRole("button", { name: "Baja aquí", exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(overview).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("las alternativas muestran tiempos y caminatas sin desbordar en móvil", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");
  await page.getByRole("button", { name: "Ver resultado de ruta", exact: true }).click();
  const panel = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
  await panel.locator("summary").click();
  const alternative = panel.getByRole("button", { name: /como ruta recomendada/ }).first();
  await expect(alternative).toContainText("Sin transbordo");
  await expect(alternative).toContainText(/\d+ m a pie/);
  await alternative.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("alternativas-320.png") });
  expect(await alternative.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  await alternative.click();
  await expect(panel.getByText("RUTA RECOMENDADA", { exact: true })).toBeVisible();
});

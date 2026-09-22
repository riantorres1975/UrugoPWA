import { expect, test } from "./fixtures";

for (const width of [320, 390, 1440]) {
  test(`directorios compactos y utilizables a ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/rutas");
    const routes = page.getByRole("list", { name: "Rutas de camión" });
    await expect(routes.locator("li")).toHaveCount(40);
    await expect(routes.locator("li").first()).toBeInViewport();
    const search = page.getByRole("textbox", { name: "Filtrar rutas" });
    await search.fill("ruta 76");
    // Alias and nearby landmarks may match other routes too.
    expect(await routes.locator("li:visible").count()).toBeLessThan(40);
    const row = routes.locator("li:visible").filter({ has: page.locator('a[href="/mapa?r=Ruta%2076"]') });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole("link")).toHaveCount(2);
    await expect(row.getByRole("link", { name: /en el mapa/ })).toHaveAttribute("href", "/mapa?r=Ruta%2076");
    await expect(row.getByRole("link").first()).toHaveAttribute("href", /\/ruta\//);
    await search.fill("destino inexistente xyz");
    await expect(page.getByText("Sin resultados", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
    await expect(routes.locator("li:visible")).toHaveCount(40);
    await page.screenshot({ path: testInfo.outputPath(`rutas-${width}.png`), animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.goto("/horarios");
    const schedules = page.getByRole("list", { name: "Horarios de rutas" });
    await expect(schedules.locator("li").first()).toBeInViewport();
    await page.getByRole("textbox", { name: "Buscar ruta o destino" }).fill("76 constituyentes");
    await expect(schedules.locator("li")).toHaveCount(1);
    await expect(schedules).toContainText("Horario");
    await expect(schedules).toContainText("Frecuencia");
    await page.getByRole("textbox", { name: "Buscar ruta o destino" }).fill("destino inexistente xyz");
    await page.getByRole("button", { name: "Ver todos los horarios" }).click();
    await expect(page.getByRole("textbox", { name: "Buscar ruta o destino" })).toHaveValue("");
    await expect(schedules.locator("li")).toHaveCount(41);
    await page.screenshot({ path: testInfo.outputPath(`horarios-${width}.png`), animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

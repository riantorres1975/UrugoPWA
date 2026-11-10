import { expect, test } from "./fixtures";

const pages = [
  "/rutas", "/horarios", "/como-llegar", "/como-llegar/centro",
  "/ruta/ruta-17-purhepechas", "/guia", "/acerca-de", "/datos-api",
  "/privacidad", "/reportar-error", "/teleferico-uruapan-horario", "/blog",
  "/apoyar",
  "/blog/como-usar-el-teleferico-uruapan",
  "/pagina-inexistente-diseno",
];

test("los directorios usan papel claro y la cabecera de UruGo", async ({ page }) => {
  for (const path of ["/rutas", "/horarios", "/como-llegar"]) {
    await page.goto(path);
    const directory = page.locator(".public-directory");
    await expect(directory).toHaveCSS("background-color", "rgb(229, 235, 218)");
    await expect(directory).toHaveCSS("color", "rgb(30, 39, 29)");
    await expect(page.locator(".site-header")).toHaveCSS("background-color", "rgb(14, 23, 16)");
  }
});

for (const width of [320, 1440]) {
  test(`las paginas publicas comparten estilos y caben a ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      await expect(page.locator("main.public-page")).toBeVisible();
      await expect(page.locator("h1")).toHaveClass(/public-page-title/);
      await expect(page.locator("footer")).toHaveCSS("color", "rgb(245, 246, 237)");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Desbordamiento horizontal en ${path}`).toBe(false);
    }
  });
}

test("el directorio de lugares filtra y conserva enlaces a destinos", async ({ page }) => {
  await page.goto("/como-llegar");
  await page.getByRole("textbox", { name: "Buscar hospital, escuela, plaza o lugar" }).fill("Hospital Regional");
  const result = page.locator(".public-directory").getByRole("link", { name: /Hospital Regional/ });
  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/como-llegar\/hospital-regional/);
});

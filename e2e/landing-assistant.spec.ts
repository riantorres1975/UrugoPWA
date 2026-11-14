import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

for (const width of [320, 1280]) {
  test(`la ayuda de la portada es opcional y abre con un toque a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    let questions = 0;
    page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/chat") questions++; });
    await page.goto("/");
    const floating = page.getByRole("complementary", { name: "Ayuda para moverte y descubrir Uruapan" });
    const button = floating.getByRole("button", { name: "Abrir asistente de rutas" });
    await expect(button).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Asistente UruGo" })).toHaveCount(0);
    expect(questions).toBe(0);
    if (width >= 768) await expect(floating.getByText("Pregúntale a UruGo")).toBeVisible();
    else await expect(floating.getByText("Pregúntale a UruGo")).not.toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(850);
    const planner = (await page.getByRole("combobox", { name: "Buscar destino" }).boundingBox())!;
    expect(box.x + box.width <= planner.x || box.x >= planner.x + planner.width || box.y + box.height <= planner.y || box.y >= planner.y + planner.height).toBe(true);
    if (width < 768) {
      const atlasAction = (await page.locator(".atlas-footer > a").boundingBox())!;
      expect(box.x + box.width <= atlasAction.x || box.x >= atlasAction.x + atlasAction.width || box.y + box.height <= atlasAction.y || box.y >= atlasAction.y + atlasAction.height).toBe(true);
    }
    const overflowBefore = await page.evaluate(() => document.body.style.overflow);
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Asistente UruGo" });
    await expect(dialog).toBeVisible();
    expect(questions).toBe(0);
    await dialog.getByRole("button", { name: "¿Qué puedo visitar en Uruapan?", exact: true }).click();
    await expect(dialog.locator(".chat-place")).toHaveCount(6);
    expect(questions).toBe(1);
    expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
    const issues = await new AxeBuilder({ page }).include("#urugo-chat-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(issues.violations).toEqual([]);
    await dialog.getByRole("button", { name: "Cerrar chat" }).click();
    await expect(button).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(overflowBefore);
    await expect(page).toHaveURL(/\/$/);
  });
}

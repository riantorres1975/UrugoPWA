import { expect, test } from "./fixtures";

for (const source of ["recientes", "casa", "búsqueda"] as const) {
  test(`un toque en ${source} conserva el foco hasta aplicar el destino`, async ({ page }) => {
    await page.route("https://api.mapbox.com/styles/v1/**", (route) => route.fulfill({
      json: { version: 8, sources: {}, layers: [] },
    }));
    await page.addInitScript(() => {
      localStorage.setItem("rutas-uru-onboarded", "1");
      localStorage.setItem("urugo-recent-places", JSON.stringify([{
        label: "Instituto Tecnológico Superior de Uruapan",
        center: [-102.0747, 19.47727],
        source: "local",
      }]));
      localStorage.setItem("urugo-saved-places", JSON.stringify({ casa: {
        label: "Instituto Tecnológico Superior de Uruapan",
        center: [-102.0747, 19.47727],
        source: "local",
      } }));
    });
    await page.goto("/mapa?a=-102.025000,19.405000");
    await expect(page.getByRole("application", { name: /Mapa interactivo/ })).toBeVisible({ timeout: 15_000 });
    const search = page.getByRole("combobox").first();
    await search.tap();
    if (source === "búsqueda") await search.fill("Instituto Tecnológico");
    const option = source === "casa"
      ? page.getByRole("button", { name: /^Casa Instituto/ })
      : page.getByRole("option", { name: /Instituto Tecnológico/ }).first();
    await expect(option).toBeVisible();

    if (source === "recientes") {
      // Position the bottom controls over the recent row as with an open keyboard.
      const box = (await option.boundingBox())!;
      await page.setViewportSize({ width: 412, height: Math.ceil(box.y + box.height / 2 + 48) });
      await expect.poll(() => option.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.right - 20, rect.top + rect.height / 2));
      })).toBe(true);
    }

    // Mobile browsers send compatibility mouse events after touchend. Losing focus
    // here dismisses the keyboard and can move the tapped row before click arrives.
    await search.evaluate((input) => {
      const events: string[] = [];
      input.addEventListener("blur", () => events.push("blur"));
      document.addEventListener("click", () => events.push("click"), { capture: true, once: true });
      input.dataset.selectionEvents = "";
      input.addEventListener("blur", () => { input.dataset.selectionEvents = JSON.stringify(events); });
    });
    const box = (await option.boundingBox())!;
    await option.tap({ position: { x: box.width - 20, y: box.height / 2 } });
    await expect(search).toHaveAttribute("data-selection-events", JSON.stringify(["click", "blur"]));
    await expect(search).not.toBeFocused();
    await expect(page.getByRole("listbox")).toBeHidden();
    await page.setViewportSize({ width: 412, height: 915 });
    await expect(page.getByRole("button", { name: "Destino marcado, toca para cambiar" }))
      .toContainText("Instituto Tecnológico");
  });
}

import { expect, test } from "./fixtures";

test("permite elegir una ruta y enviar una corrección desde el formulario general", async ({ page }) => {
  let submittedBody: Record<string, unknown> | null = null;
  await page.route("**/api/community/reports", async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/reportar-error");
  const routeGuide = page.locator('video[aria-label="Ejemplo para reportar y dibujar la corrección de una ruta"]');
  await expect(routeGuide).toHaveCount(0);
  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  await expect(routeGuide).toBeVisible();
  await expect(routeGuide.locator("source")).toHaveAttribute("src", "/readme/reportar-ruta.mp4");
  await page.getByRole("button", { name: "Ocultar ejemplo" }).click();
  await expect(routeGuide).toHaveCount(0);
  await page.getByLabel("Elige una ruta").selectOption({ label: "Ruta 17" });
  await expect(page.getByText("Marca por dónde pasa realmente.")).toBeVisible();
  await page.getByLabel("Detalle del reporte").fill("Ahora entra por la colonia y ya no sigue el recorrido que aparece en el mapa.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();

  await expect(page.getByRole("heading", { name: "Gracias, ya quedó en revisión." })).toBeVisible();
  expect(submittedBody).toMatchObject({
    reportType: "route_changed",
    routeKey: "ruta-17-purhepechas",
    routeName: "Ruta 17",
  });
});

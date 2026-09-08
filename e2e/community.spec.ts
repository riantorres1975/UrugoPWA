import { expect, test } from "./fixtures";

test("el reporte comunitario confirma que queda pendiente de revisión", async ({ page }) => {
  let submittedRouteKey: string | null = null;
  let submittedEvidenceUrl: string | null = null;
  await page.route("**/api/community/reports", (route) => {
    const submission = route.request().postDataJSON() as { routeKey?: string; evidenceUrl?: string };
    submittedRouteKey = submission.routeKey ?? null;
    submittedEvidenceUrl = submission.evidenceUrl ?? null;
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto("/reportar-error?ruta=Ruta%2014&clave=ruta-14-llanitos");

  await page.getByText("Ya no circula", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Ya no circula/ })).toBeChecked();
  await page.getByLabel("Detalle del reporte").fill("Varias personas indican que esta ruta ya no circula.");
  await page.locator("summary").filter({ hasText: "Agregar contacto o evidencia" }).click();
  await page.getByLabel("Enlace a foto o aviso").fill("https://example.com/aviso-ruta-14");
  await page.getByRole("button", { name: "Enviar reporte" }).click();

  await expect(page.getByRole("heading", { name: "Gracias, ya quedó en revisión." })).toBeVisible();
  await expect(page.getByText(/antes de hacer cambios en el mapa/)).toBeVisible();
  expect(submittedRouteKey).toBe("ruta-14-llanitos");
  expect(submittedEvidenceUrl).toBe("https://example.com/aviso-ruta-14");
});

test("la página de una ruta permite enviar una confirmación rápida", async ({ page }) => {
  await page.route("**/api/v1/routes/*/community-status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ state: "recently_seen", observedAt: "2026-09-02T12:00:00.000Z", supportCount: 2, requiredCount: 2, evidenceType: "circulating" }),
  }));
  await page.route("**/api/community/confirmations", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));
  await page.goto("/ruta/ruta-17-purhepechas");

  await expect(page.getByRole("heading", { name: "¿Has visto esta ruta recientemente?" })).toBeVisible();
  await expect(page.getByText("Actividad confirmada", { exact: true })).toBeVisible();
  await expect(page.getByText(/2 confirmaciones independientes/)).toBeVisible();
  await page.getByRole("button", { name: "La vi circular" }).click();
  await expect(page.getByText("Gracias. Tu confirmación quedó registrada.")).toBeVisible();
});

test("el panel administrativo no se indexa", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Administración privada")).toBeVisible();
});

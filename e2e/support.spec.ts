import { expect, test } from "./fixtures";

test("la pagina de apoyo explica el destino y abre el proveedor fuera de UruGo", async ({ page }) => {
  await page.goto("/apoyar");

  await expect(page.getByRole("heading", { name: /Ayuda a que UruGo siga siendo gratuito/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "En qué puede usarse tu apoyo." })).toBeVisible();

  const paypal = page.getByRole("link", { name: /Abrir PayPal/ });
  await expect(paypal).toHaveAttribute("href", /^https:\/\//);
  await expect(paypal).toHaveAttribute("target", "_blank");

  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Apoyar UruGo" }).first()).toHaveAttribute("href", "/apoyar");
});

import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";
const code = "UG-" + "ab".repeat(24);
const pending = { status: "pending", publication_status: "pending", visibility: "named", display_name: "Persona de prueba", show_amount: false, amount_cents: 5000, revision: 1, created_at: "2026-11-13T16:00:00Z", confirmed_at: null };
const confirmed = { ...pending, status: "confirmed", publication_status: "approved", revision: 2, confirmed_at: "2026-11-13T17:00:00Z" };

test("el código viaja por POST, desaparece de la URL y permite consultar el estado", async ({ page }) => {
  let seen: Record<string, unknown> = {};
  await page.route("**/api/support/manage", (route) => { seen = route.request().postDataJSON(); expect(route.request().url()).not.toContain(code); return route.fulfill({ json: { receipt: pending } }); });
  await page.goto(`/apoyar/mi-aporte#codigo=${code}`);
  await expect(page.getByRole("heading", { name: "Pendiente de verificación", exact: true })).toBeVisible();
  expect(seen).toEqual({ action: "status", code });
  expect(new URL(page.url()).hash).toBe(""); expect(new URL(page.url()).search).toBe("");
  await expect(page.getByRole("button", { name: "Compartir mi apoyo" })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(code);
});

test("ocultar el agradecimiento mantiene el pago confirmado y compartir nunca envía el acceso", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => {
      (window as unknown as { shared: unknown }).shared = { title: data.title, text: data.text, url: data.url, files: data.files?.map((file) => ({ type: file.type, name: file.name })) };
    } });
  });
  let visibility = "named";
  await page.route("**/api/support/manage", (route) => {
    const input = route.request().postDataJSON();
    if (input.action === "privacy") { expect(input).toMatchObject({ code, visibility: "private", showAmount: false }); visibility = "private"; }
    return route.fulfill({ json: { receipt: { ...confirmed, visibility, display_name: visibility === "named" ? "Persona de prueba" : null, publication_status: visibility === "private" ? "withdrawn" : "approved", revision: visibility === "private" ? 3 : 2 } } });
  });
  await page.goto(`/apoyar/mi-aporte#codigo=${code}`);
  await expect(page.getByRole("button", { name: "Descargar tarjeta" })).toBeEnabled();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Descargar tarjeta" }).click();
  const file = await download; expect(file.suggestedFilename()).toBe("yo-apoyo-a-urugo.png");
  const bytes = await readFile((await file.path())!); expect([...bytes.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
  await page.getByRole("button", { name: "Compartir mi apoyo" }).click();
  const shared = await page.evaluate(() => (window as unknown as { shared: unknown }).shared);
  expect(shared).toMatchObject({ files: [{ type: "image/png", name: "yo-apoyo-a-urugo.png" }] });
  expect(JSON.stringify(shared)).not.toContain(code); expect(JSON.stringify(shared)).not.toContain("5000");
  await page.getByLabel("No aparecer", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("heading", { name: "Aporte confirmado · reconocimiento privado" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartir mi apoyo" })).toBeVisible();
});

test("el nombre corregido se revisa de nuevo y la pantalla privada cabe en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route("**/api/support/manage", (route) => {
    const input = route.request().postDataJSON();
    return route.fulfill({ json: { receipt: input.action === "privacy" ? { ...confirmed, display_name: input.name, publication_status: "pending", revision: 3 } : confirmed } });
  });
  await page.goto(`/apoyar/mi-aporte#codigo=${code}`);
  await page.getByLabel("Nombre o seudónimo público").fill("Nombre corregido");
  await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("heading", { name: "Aporte confirmado · nombre en revisión" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(audit.violations).toEqual([]);
});

test("un código incorrecto no expone datos y permite intentar de nuevo", async ({ page }) => {
  await page.route("**/api/support/manage", (route) => route.fulfill({ status: 404, json: { error: "No encontramos un aviso con ese código." } }));
  await page.goto("/apoyar/mi-aporte");
  await page.getByLabel("Código privado de tu aporte").fill(code);
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(page.locator(".support-manager").getByRole("alert")).toContainText("No encontramos");
  await expect(page.getByLabel("Código privado de tu aporte")).toHaveValue(code);
});

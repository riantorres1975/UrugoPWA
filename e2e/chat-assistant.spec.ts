import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

async function openChat(page: import("@playwright/test").Page) {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");
  await page.locator('button[aria-label="Abrir asistente de rutas"]:visible').click();
  const dialog = page.getByRole("dialog", { name: "Asistente UruGo" });
  await expect(dialog).toBeVisible(); return dialog;
}

test("el bot muestra turismo verificado con fuentes y enlaces de viaje a 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const dialog = await openChat(page);
  await dialog.getByRole("button", { name: "¿Qué puedo visitar en Uruapan?", exact: true }).click();
  await expect(dialog.locator(".chat-place")).toHaveCount(6);
  const park = dialog.locator(".chat-place").first();
  await expect(park).toContainText("Barranca del Cupatitzio");
  await park.locator("summary").click();
  await expect(park.getByRole("link", { name: /Fuente:/ })).toBeVisible();
  await expect(park.getByRole("link", { name: /Fuente:/ })).toHaveAttribute("href", "https://uruapan.gob.mx/turismo-cultural-y-natural/");
  const href = await park.getByRole("link", { name: /Ubicar y planear/ }).getAttribute("href");
  expect(new URL(href!, "http://localhost").searchParams.get("b")).toBe("-102.071525,19.424195");
  expect(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
  const results = await new AxeBuilder({ page }).include("#urugo-chat-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("mantiene el destino al indicar el origen y permite empezar de nuevo", async ({ page }) => {
  const dialog = await openChat(page);
  await dialog.getByRole("button", { name: "¿Cómo llego al Parque Nacional?", exact: true }).click();
  await expect(dialog.locator(".chat-bubble").last()).toContainText("desde dónde sales");
  await dialog.getByRole("button", { name: "Salgo de la Central de Autobuses", exact: true }).click();
  await expect(dialog.locator(".chat-bubble").last()).toContainText("Desde Central de Autobuses");
  const map = dialog.getByRole("link", { name: /Revisar trayecto en el mapa/ });
  const url = new URL((await map.getAttribute("href"))!, "http://localhost");
  expect(url.searchParams.has("a")).toBe(true); expect(url.searchParams.has("b")).toBe(true);
  await dialog.getByRole("button", { name: "Empezar nueva conversación" }).click();
  await expect(dialog.getByText("¿A dónde vamos hoy?", { exact: true })).toBeVisible();
  await expect(dialog.locator(".chat-bubble")).toHaveCount(0);
});

test("el panel de escritorio cabe sobre el botón y muestra los errores del API", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 850 });
  const dialog = await openChat(page);
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(850);
  await page.route("**/api/chat", (route) => route.fulfill({ status: 429, json: { error: "Espera un momento antes de otra consulta." } }));
  await dialog.getByRole("textbox", { name: "Escribe tu pregunta sobre rutas" }).fill("Otra pregunta");
  await dialog.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(dialog.locator(".chat-bubble").last()).toHaveText("Espera un momento antes de otra consulta.");
  await expect(dialog.getByText("Sin respuesta.", { exact: true })).toHaveCount(0);
});


test("puede detener una consulta sin perder lo que está escribiendo", async ({ page }) => {
  const dialog = await openChat(page);
  let release!: () => void;
  let requests = 0;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/chat", async (route) => {
    requests++;
    await gate;
    await route.fulfill({ json: { reply: "Esta respuesta llegó demasiado tarde" } }).catch(() => {});
  });
  try {
    const field = dialog.getByRole("textbox", { name: "Escribe tu pregunta sobre rutas" });
    await field.fill("¿Cómo llego al Centro?");
    await dialog.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Detener consulta" })).toBeVisible();
    await expect.poll(() => requests).toBe(1);
    await field.fill("Prefiero salir de la Central");
    await dialog.getByRole("button", { name: "Detener consulta" }).click();
    release();
    await expect(field).toHaveValue("Prefiero salir de la Central");
    await expect(dialog.locator(".chat-bubble").last()).toContainText("Consulta detenida");
    await expect(dialog.getByText("Esta respuesta llegó demasiado tarde", { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Enviar", exact: true })).toBeEnabled();
    expect(requests).toBe(1);
  } finally { release(); }
});

test("copia una respuesta y prepara un reporte sin enviarlo automáticamente", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as unknown as { copiedReply: string }).copiedReply = text; } } });
  });
  const dialog = await openChat(page);
  await dialog.getByRole("button", { name: "¿Cuánto cuesta el pasaje?", exact: true }).click();
  const reply = dialog.locator(".chat-bubble").last();
  await expect(reply).toContainText("$12.00");
  const text = await reply.innerText();
  await dialog.getByRole("button", { name: "Copiar respuesta" }).click();
  await expect(dialog.getByRole("status")).toContainText("Respuesta copiada");
  expect(await page.evaluate(() => (window as unknown as { copiedReply: string }).copiedReply)).toBe(text);
  await dialog.getByRole("button", { name: "Reportar error" }).click();
  const report = page.getByRole("dialog", { name: "Reportar respuesta" });
  await expect(report.getByLabel("¿Qué información debemos revisar?")).toHaveValue(text);
  await expect(report.getByRole("link", { name: "Preparar correo" })).toHaveAttribute("href", /^mailto:contacto@urugo.app\?/);
  const results = await new AxeBuilder({ page }).include("#urugo-chat-panel").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await report.getByRole("button", { name: "Volver a la conversación" }).click();
  await expect(dialog.locator(".chat-bubble").last()).toHaveText(text);
});

test("el campo de escritura queda por encima de un teclado superpuesto", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = await openChat(page);
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", { configurable: true, get: () => 360 });
    Object.defineProperty(viewport, "offsetTop", { configurable: true, get: () => 0 });
    viewport.dispatchEvent(new Event("resize"));
  });
  const field = dialog.getByRole("textbox", { name: "Escribe tu pregunta sobre rutas" });
  await field.fill("Desde la Central");
  await field.press("Shift+Enter");
  await field.pressSequentially("al Parque Nacional");
  await expect(field).toHaveValue("Desde la Central\nal Parque Nacional");
  await expect.poll(async () => {
    const box = (await field.boundingBox())!;
    return box.y + box.height;
  }).toBeLessThanOrEqual(360);
  const box = (await dialog.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.height).toBeLessThanOrEqual(360);
});

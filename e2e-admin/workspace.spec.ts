import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Publishing creates an immutable revision. This suite uses the disposable local
// stack and removes only its own fixture rows in a teardown transaction.
test.skip(process.env.TEST_SUPABASE_URL?.replace(/\/$/, "") !== "http://127.0.0.1:54321", "El espacio de trabajo se prueba solo con Supabase local.");
test.use({ actionTimeout: 10_000 });
const run = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const routeId = 7_000_000_000_000 + (Date.now() % 1_000_000_000) * 2;
const routeName = `Ruta UX ${run}`;
const adminEmail = `workspace-${run}@example.com`;
const path: [number, number][] = [[-102.075, 19.41], [-102.073, 19.41], [-102.071, 19.41], [-102.069, 19.41], [-102.067, 19.41]];
let db: SupabaseClient;
let userId: string | null = null;

test.beforeAll(async () => {
  db = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const user = await db.auth.admin.createUser({ email: adminEmail, email_confirm: true });
  if (user.error || !user.data.user) throw user.error ?? new Error("No se creó el administrador de prueba.");
  userId = user.data.user.id;
  const member = await db.from("admin_members").insert({ email: adminEmail, user_id: userId, active: true });
  if (member.error) throw member.error;
  const routes = await db.from("routes").insert(["Ida", "Vuelta"].map((direction, i) => ({
    id: routeId + i, name: routeName, original_name: `${routeName} (${direction})`, color: "#57d6e8",
    corridor_width_m: 500, data_version: i + 1, path: i ? [...path].reverse() : path,
    landmarks: [], operational_status: "active", publication_status: "published", verified: false,
  })));
  if (routes.error) throw routes.error;
  const inserted = await db.from("community_reports").insert(Array.from({ length: 21 }, (_, i) => ({
    route_id: routeId, route_name: routeName, route_key: "ruta-26-constituyentes-unidad", report_type: "route_changed", status: "pending",
    description: `Aviso UX ${run} número ${String(i + 1).padStart(2, "0")}`, place: "Centro",
    created_at: new Date(Date.now() - (9 * 86_400_000) + i * 1000).toISOString(),
    proposed_path: [path[0], [-102.071, 19.412], path.at(-1)],
  }))).select("id");
  if (inserted.error) throw inserted.error;
});

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  // Use a local background and local provider fixtures: no tiles, credentials or
  // billing requests are needed to exercise editing our GeoJSON geometry.
  await page.route("https://api.mapbox.com/map-sessions/v1**", (route) => route.fulfill({ json: {} }));
  await page.route("https://events.mapbox.com/**", (route) => route.fulfill({ status: 204 }));
  await page.route("https://api.mapbox.com/styles/v1/**", (route) => route.fulfill({ json: {
    version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#dedfd6" } }],
  } }));
  const link = await db.auth.admin.generateLink({ type: "magiclink", email: adminEmail, options: { redirectTo: "http://localhost:3200/auth/callback" } });
  if (link.error || !link.data.properties?.hashed_token) throw link.error ?? new Error("No se generó la sesión local.");
  await page.goto(`/auth/callback?token_hash=${link.data.properties.hashed_token}&type=email`);
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
});

test.afterAll(async () => {
  if (!db) return;
  const container = process.env.TEST_SUPABASE_CONTAINER || "supabase_db_rutas-uruapan";
  if (!/^supabase_db_[a-z0-9_-]+$/.test(container)) throw new Error("Contenedor de pruebas no válido.");
  const sql = `begin;
    alter table public.route_revisions disable trigger route_revisions_are_immutable;
    delete from public.route_revisions where route_id in (${routeId},${routeId + 1});
    delete from public.moderation_audit where report_id in (select id from public.community_reports where route_id = ${routeId});
    delete from public.community_reports where route_id = ${routeId};
    delete from public.routes where id in (${routeId},${routeId + 1});
    alter table public.route_revisions enable trigger route_revisions_are_immutable;
    commit;`;
  execFileSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], { stdio: "pipe" });
  await db.from("admin_members").delete().eq("email", adminEmail);
  if (userId) await db.auth.admin.deleteUser(userId);
});

test("cambia solo un tramo, deshace, rehace y recupera el borrador al recargar", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto(`/admin/routes?buscar=${encodeURIComponent(routeName)}`);
  const catalog = page.getByRole("region", { name: routeName, exact: true });
  await expect(catalog).toContainText("2 recorridos");
  await page.getByLabel("Sentido", { exact: true }).selectOption("Vuelta");
  await page.getByRole("button", { name: "Filtrar rutas" }).click();
  await expect(catalog).toContainText(`Vuelta · #${routeId + 1}`);
  await expect(catalog).not.toContainText(`Ida · #${routeId}`);
  await page.goto(`/admin/routes/${routeId}`);
  const editor = page.getByRole("region", { name: "Editor del recorrido" });
  await editor.getByRole("button", { name: "Cambiar un tramo" }).click();
  await expect(editor.getByRole("button", { name: "Ver recorrido completo" })).toBeVisible();
  await editor.getByLabel("Número de punto").fill("2");
  await editor.getByRole("button", { name: "Seleccionar punto", exact: true }).click();
  await editor.getByRole("button", { name: "Usar punto 2 como A" }).click();
  await editor.getByLabel("Número de punto").fill("4");
  await editor.getByRole("button", { name: "Seleccionar punto", exact: true }).click();
  await editor.getByRole("button", { name: "Usar punto 4 como B" }).click();
  const canvas = editor.getByLabel("Mapa del recorrido");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * .42, box.y + box.height * .35);
  await page.mouse.click(box.x + box.width * .62, box.y + box.height * .35);
  await expect(editor).toContainText("Se reemplaza 1 punto intermedio por 2 nuevos");
  await editor.getByRole("button", { name: "Unir al recorrido" }).click();
  await expect(editor).toContainText("6 puntos · Borrador modificado");
  const changed = JSON.parse(await page.locator('input[name="path"]').inputValue());
  expect(changed.slice(0, 2)).toEqual(path.slice(0, 2));
  expect(changed.slice(-2)).toEqual(path.slice(-2));
  expect(changed).not.toContainEqual(path[2]);
  await editor.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(editor).toContainText("5 puntos · Trazado actual");
  await editor.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Borrador guardado en este dispositivo" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Recuperar borrador", exact: true }).click();
  await expect(editor).toContainText("6 puntos · Borrador modificado");
  expect(JSON.parse(await page.locator('input[name="path"]').inputValue())).toEqual(changed);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await editor.getByRole("button", { name: "Ver recorrido completo" }).click();
    await page.waitForTimeout(450); // Let Mapbox's camera animation finish before visual QA.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await editor.screenshot({ path: testInfo.outputPath(`editor-${width}.png`) });
  }
  const accessibility = await new AxeBuilder({ page }).exclude(".mapboxgl-control-container").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("recorre toda la bandeja, conserva filtros y conecta un reporte con su publicación", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const search = encodeURIComponent(routeName);
  await page.goto(`/admin?buscar=${search}&tipo=route_changed&orden=antiguos`);
  await expect(page.getByRole("navigation", { name: "Páginas de reportes" })).toContainText("1–20 de 21");
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.getByLabel("Buscar por ruta, lugar o descripción")).toHaveValue(routeName);
  await expect(page.getByRole("navigation", { name: "Páginas de reportes" })).toContainText("21–21 de 21");
  const report = page.locator("article").filter({ hasText: `Aviso UX ${run} número 21` });
  await report.getByTitle("Marcar en revisión").click();
  await expect(page).not.toHaveURL(/pagina=2/);
  await page.goto(`/admin?estado=reviewing&buscar=${search}`);
  await report.getByRole("button", { name: "Aprobar y editar ruta" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/routes/${routeId}\\?reporte=`));
  const editor = page.getByRole("region", { name: "Editor del recorrido" });
  await editor.getByRole("button", { name: "Cargar propuesta como borrador" }).click();
  await page.getByLabel("Resumen del cambio").fill("Corregido el tramo señalado en el aviso de prueba local.");
  await page.getByRole("button", { name: "Revisar publicación" }).click();
  await expect(page.getByRole("region", { name: "Datos y publicación" })).toContainText("Ida");
  await page.getByRole("button", { name: "Confirmar publicación de versión 2" }).click();
  await expect(page).toHaveURL(/publicada=2/);
  await expect(page.getByRole("status").filter({ hasText: "Versión 2 publicada" }).first()).toBeVisible();
  const result = await db.from("routes").select("path,data_version").eq("id", routeId).single();
  expect(result.data?.data_version).toBe(2);
  expect(result.data?.path).toHaveLength(3);
  await page.getByRole("link", { name: "Volver al reporte", exact: true }).click();
  await expect(page).toHaveURL(/estado=approved&reporte=/);
  await expect(report).toContainText("Corrección publicada · v2");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("reportes-390.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("un borrador de una versión anterior no sustituye el recorrido actual", async ({ page }) => {
  await page.evaluate(({ routeId, routeName, path }) => {
    localStorage.setItem(`urugo-admin-route-draft-v1:${routeId}:manual`, JSON.stringify({
      routeId, baseVersion: 1, reportId: null, savedAt: Date.now(), path: JSON.stringify(path),
      name: routeName, direction: `${routeName} (Vuelta)`, color: "#57d6e8", width: "500", operationalStatus: "active",
      summary: "Cambio anterior aún sin publicar", segment: null,
    }));
  }, { routeId: routeId + 1, routeName, path });
  await page.goto(`/admin/routes/${routeId + 1}`);
  await expect(page.getByRole("region", { name: "Borrador recuperable" })).toContainText("la ruta ya está en la versión 2");
  await expect(page.getByRole("button", { name: "Recuperar borrador", exact: true })).toHaveCount(0);
  expect(JSON.parse(await page.locator('input[name="path"]').inputValue())).toEqual([...path].reverse());
});

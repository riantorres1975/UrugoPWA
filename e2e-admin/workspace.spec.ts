import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
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
let streets: Server;

test.beforeAll(async () => {
  streets = createServer((request, response) => {
    const coordinates = request.url?.split("/driving/")[1]?.split("?")[0]?.split(";").map((p) => p.split(",").map(Number)) ?? [];
    const [a, b] = [coordinates[0], coordinates.at(-1)];
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(a && b ? { code: "Ok", routes: [{ geometry: { type: "LineString", coordinates: [a, [(a[0] + b[0]) / 2, a[1] + .001], b] } }] } : { code: "NoRoute" }));
  });
  await new Promise<void>((resolve) => streets.listen(3299, "127.0.0.1", resolve));
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
  if (streets) await new Promise<void>((resolve, reject) => streets.close((error) => error ? reject(error) : resolve()));
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

test("revisa la propuesta de calles antes de unirla y marca los segmentos sustituidos", async ({ page }) => {
  await page.goto(`/admin/routes/${routeId}`);
  const editor = page.getByRole("region", { name: "Editor del recorrido" });
  await editor.getByRole("button", { name: "Cambiar un tramo", exact: true }).click();
  for (const [number, label] of [[2, "A"], [4, "B"]] as const) {
    await editor.getByLabel("Número de punto").fill(String(number));
    await editor.getByRole("button", { name: "Seleccionar punto", exact: true }).click();
    await editor.getByRole("button", { name: `Usar punto ${number} como ${label}` }).click();
  }
  await editor.getByRole("button", { name: "Proponer trazado por calles" }).click();
  await expect(editor.getByRole("button", { name: "Usar propuesta y revisar en mapa" })).toBeVisible();
  expect(JSON.parse(await page.locator('input[name="path"]').inputValue())).toEqual(path);
  await editor.getByRole("button", { name: "Usar propuesta y revisar en mapa" }).click();
  await editor.getByRole("button", { name: "Unir al recorrido" }).click();
  const changed = JSON.parse(await page.locator('input[name="path"]').inputValue());
  expect(changed.slice(0, 2)).toEqual(path.slice(0, 2)); expect(changed.slice(-2)).toEqual(path.slice(-2));
  expect(changed[2][1]).toBeCloseTo(19.411);
  await editor.getByRole("button", { name: "Resaltar tramos que cambian" }).click();
  await expect(editor).toContainText("2 segmentos retirados · 2 agregados");
});

test("busca referencias y prueba subidas y bajadas sobre el borrador", async ({ page }) => {
  await page.goto(`/admin/routes/${routeId}`);
  const editor = page.getByRole("region", { name: "Editor del recorrido" });
  await editor.getByRole("button", { name: "Editar en el mapa", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Ver recorrido completo" })).toBeVisible();
  await editor.getByLabel("Buscar calle, colonia o referencia").fill("Centro");
  await editor.getByRole("button", { name: "Buscar en mapa" }).click();
  await editor.getByRole("button", { name: "Centro", exact: true }).click();
  await expect(editor.getByRole("status").filter({ hasText: "Mapa centrado en Centro" })).toBeVisible();
  await editor.getByRole("button", { name: "Ver recorrido completo" }).click();
  await page.waitForTimeout(450);
  await editor.getByText("Probar un viaje antes de publicar", { exact: true }).click();
  for (const [target, x] of [["origen", .25], ["destino", .75]] as const) {
    await editor.getByRole("button", { name: `Marcar ${target} de prueba` }).click();
    const canvas = editor.getByLabel("Mapa del recorrido"); await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width * x, box.y + box.height * .5);
  }
  await editor.getByRole("button", { name: "Calcular prueba" }).click();
  await expect(editor.getByText("Incluye el borrador", { exact: false })).toBeVisible();
  await editor.getByRole("button", { name: "Ver subidas, bajadas y cambio" }).first().click();
  await expect(page.locator('input[name="path"]')).toHaveValue(JSON.stringify(path));
});

test("sincroniza el borrador entre dispositivos y rechaza sobrescrituras concurrentes", async ({ page, browser }) => {
  await page.goto(`/admin/routes/${routeId + 1}`);
  await expect(page.getByRole("button", { name: "Guardar en mi cuenta", exact: true })).toBeEnabled();
  await page.getByLabel("Resumen del cambio", { exact: true }).fill("Cambio guardado desde el primer dispositivo");
  await page.getByRole("button", { name: "Guardar en mi cuenta", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Borrador guardado en tu cuenta" })).toBeVisible();
  const stored = await db.from("route_editor_drafts").select("snapshot,revision").eq("route_id", routeId + 1).eq("user_id", userId!).single();
  expect(stored.error).toBeNull(); expect(stored.data?.snapshot.summary).toContain("primer dispositivo");
  const storage = await page.context().storageState();
  const context = await browser.newContext({ storageState: { cookies: storage.cookies, origins: [] } });
  try {
    const second = await context.newPage();
    await second.goto(`http://localhost:3200/admin/routes/${routeId + 1}`);
    await expect(second.getByText(/otra\(s\) sesión/)).toBeVisible();
    await second.getByRole("button", { name: "Continuar borrador de mi cuenta" }).click();
    await expect(second.getByLabel("Resumen del cambio", { exact: true })).toHaveValue("Cambio guardado desde el primer dispositivo");
    await second.getByLabel("Resumen del cambio", { exact: true }).fill("Actualización automática desde el segundo dispositivo");
    await expect.poll(async () => (await db.from("route_editor_drafts").select("snapshot").eq("route_id", routeId + 1).eq("user_id", userId!).single()).data?.snapshot.summary)
      .toBe("Actualización automática desde el segundo dispositivo");
    const updated = await db.from("route_editor_drafts").select("snapshot,revision").eq("route_id", routeId + 1).eq("user_id", userId!).single();
    const input = { p_route_id: routeId + 1, p_user_id: userId!, p_base_version: 2, p_revision: updated.data!.revision, p_snapshot: updated.data!.snapshot };
    const first = await db.rpc("save_route_editor_draft", input);
    expect(first.error).toBeNull();
    const conflict = await db.rpc("save_route_editor_draft", input);
    expect(conflict.error?.code).toBe("40001");
    const stale = await db.rpc("save_route_editor_draft", { ...input, p_base_version: 1, p_revision: first.data });
    expect(stale.error?.code).toBe("40001");
    const anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    expect((await anon.from("route_editor_drafts").select("snapshot")).error).not.toBeNull();
    expect((await anon.rpc("save_route_editor_draft", input)).error).not.toBeNull();
  } finally { await context.close(); await db.from("route_editor_drafts").delete().eq("route_id", routeId + 1); }
});

test("cierra un reporte con solución, fecha y responsable sin publicar geometría", async ({ page }) => {
  const report = await db.from("community_reports").select("id").eq("route_id", routeId).order("created_at").limit(1).single();
  const note = "Comprobamos el horario correcto y se actualizó la información pública.";
  await page.goto(`/admin?reporte=${report.data!.id}`);
  await page.getByText("Marcar como resuelto", { exact: true }).click();
  await page.getByLabel("Cómo se solucionó", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Confirmar solución" }).click();
  await page.goto(`/admin?estado=resolved&reporte=${report.data!.id}`);
  await expect(page.locator("article")).toContainText(note);
  const resolved = await db.from("community_reports").select("status,resolution_note,resolved_by,resolved_at").eq("id", report.data!.id).single();
  expect(resolved.data).toMatchObject({ status: "approved", resolution_note: note, resolved_by: userId });
  expect(resolved.data?.resolved_at).toBeTruthy();
  expect((await db.from("routes").select("data_version").eq("id", routeId).single()).data?.data_version).toBe(1);
  // Leave the shared inbox fixture unchanged for the pagination test below.
  await db.from("community_reports").update({ status: "pending", resolution_note: null, resolved_at: null, resolved_by: null }).eq("id", report.data!.id);
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
  await editor.getByRole("button", { name: "Mostrar sentido opuesto" }).click();
  await expect(editor.getByRole("button", { name: "Ocultar sentido opuesto" })).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByRole("button", { name: "Ver ambos sentidos" })).toBeVisible();
  expect(JSON.parse(await page.locator('input[name="path"]').inputValue())).toEqual(path);
  await page.waitForTimeout(350); // Allow Mapbox's newly visible symbols to finish appearing.
  await editor.screenshot({ path: testInfo.outputPath("sentido-opuesto.png") });
  await editor.getByRole("button", { name: "Ocultar sentido opuesto" }).click();
  await expect(editor.getByRole("button", { name: "Mostrar sentido opuesto" })).toHaveAttribute("aria-pressed", "false");
  await expect(editor.getByRole("button", { name: "Ver ambos sentidos" })).not.toBeVisible();
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

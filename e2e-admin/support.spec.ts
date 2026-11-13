import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { supportMonthKey } from "../lib/support-management";

const run = `support-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `${run}@example.com`;
let db: SupabaseClient;
let userId: string;
const ids: string[] = [];

test.beforeAll(async () => {
  const url = process.env.TEST_SUPABASE_URL!;
  if (new URL(url).href !== "http://127.0.0.1:54321/") throw new Error("Los apoyos de prueba requieren Supabase local.");
  db = createClient(url, process.env.TEST_SUPABASE_SECRET_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const user = await db.auth.admin.createUser({ email, email_confirm: true });
  if (user.error || !user.data.user) throw user.error ?? Error("No se creó el usuario de prueba.");
  userId = user.data.user.id;
  const member = await db.from("admin_members").insert({ email, user_id: userId, active: true });
  if (member.error) throw member.error;
});

test.afterAll(async () => {
  const container = process.env.TEST_SUPABASE_CONTAINER || "supabase_db_rutas-uruapan";
  if (!["supabase_db_urugo-admin-ux-tests", "supabase_db_rutas-uruapan"].includes(container)) throw new Error("Limpieza de apoyos limitada al contenedor de pruebas.");
  // Only our generated UUIDs. The table deliberately grants no public delete access.
  if (ids.length && ids.every((id) => /^[a-f0-9-]{36}$/.test(id))) execFileSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `delete from public.support_contributions where id in (${ids.map((id) => `'${id}'::uuid`).join(",")});`], { stdio: "pipe" });
  if (userId && /^[a-f0-9-]{36}$/.test(userId)) execFileSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", `delete from public.support_monthly_goals where updated_by='${userId}'::uuid;`], { stdio: "pipe" });
  if (db) {
    await db.from("admin_members").delete().eq("email", email);
    if (userId) await db.auth.admin.deleteUser(userId);
  }
});

test("consulta privada, metas reales configuradas y recuperación del acceso", async ({ page, request }) => {
  test.setTimeout(90000);
  const accessCode = "UG-" + createHash("sha256").update(run + "private").digest("hex").slice(0,48);
  const reference = `${run}-private-tools`;
  const sent = await request.post("/api/support/contributions", { data: { method: "paypal", amount: "12.50", reference, visibility: "named", name: "Persona de prueba privada", showAmount: true, paid: true, accessCode }, headers: { origin: "http://localhost:3200" } });
  expect(sent.status()).toBe(201); expect((await sent.json()).accessCode).toBe(accessCode);
  const record = await db.from("support_contributions").select("id").eq("payment_reference", reference).single();
  if (record.error) throw record.error; ids.push(record.data.id);
  const link = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: "http://localhost:3200/auth/callback" } });
  if (link.error) throw link.error;
  await page.goto(`/auth/callback?token_hash=${link.data.properties.hashed_token}&type=email`);
  await page.goto("/admin/apoyos");
  const card = page.locator("article").filter({ hasText: reference });
  await card.getByLabel("Comprobé el identificador").check(); await card.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(card).toHaveCount(0);
  await page.getByText("Meta mensual de mantenimiento", { exact: true }).click();
  await page.getByLabel(`Meta real de ${supportMonthKey()} en MXN`).fill("50");
  await page.getByLabel("Qué gastos se cubrirán").fill("Meta de prueba en Supabase aislado, sin gastos reales");
  await page.getByLabel("Mostrar esta meta públicamente").check();
  await page.getByRole("button", { name: "Guardar meta", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Meta mensual guardada y publicada" })).toBeVisible();
  expect((await db.rpc("get_support_wall")).data.goal.raised_cents).toBe(1250);
  await page.goto(`/apoyar/mi-aporte#codigo=${accessCode}`);
  await expect(page.getByRole("heading", { name: "Publicado en la comunidad", exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("No aparecer", { exact: true }).check(); await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("heading", { name: "Aporte confirmado · reconocimiento privado", exact: true })).toBeVisible();
  expect((await db.rpc("get_support_wall")).data.goal.raised_cents).toBe(0);
  await page.getByLabel("Con mi nombre", { exact: true }).check(); await page.getByLabel("Nombre o seudónimo público").fill("Nombre corregido E2E");
  await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("heading", { name: "Aporte confirmado · nombre en revisión", exact: true })).toBeVisible();
  await page.goto("/admin/apoyos?estado=publication");
  const changed = page.locator("article").filter({ hasText: reference }); await expect(changed).toContainText("Nombre corregido E2E");
  await changed.getByText("Acceso privado de la persona que apoyó", { exact: true }).click();
  await changed.getByLabel("Entregaré el código únicamente").check(); await changed.getByRole("button", { name: "Crear código privado nuevo" }).click();
  await expect(changed.locator(".support-access-ticket code")).toBeVisible();
  const newCode = await changed.locator(".support-access-ticket code").innerText(); expect(newCode).not.toBe(accessCode);
  const oldAccess = await request.post("/api/support/manage", { data: { action: "status", code: accessCode }, headers: { origin: "http://localhost:3200" } }); expect(oldAccess.status()).toBe(404);
  const newAccess = await request.post("/api/support/manage", { data: { action: "status", code: newCode }, headers: { origin: "http://localhost:3200" } }); expect(newAccess.status()).toBe(200);
  const dto = await newAccess.json(); expect(dto.receipt.status).toBe("confirmed"); expect(dto.receipt).not.toHaveProperty("payment_reference");
});

test("verifica pagos antes de reconocerlos y mantiene en privado referencias y montos no autorizados", async ({ page, request }) => {
  const reference = `${run}-named`;
  const claim = await request.post("/api/support/contributions", { data: { method: "paypal", amount: "50", reference, visibility: "named", name: "Apoyo de prueba E2E", showAmount: true, paid: true }, headers: { origin: "http://localhost:3200" } });
  expect(claim.status()).toBe(201);
  const inserted = await db.from("support_contributions").select("id,status,revision").eq("payment_reference", reference).single();
  expect(inserted.error).toBeNull(); expect(inserted.data?.status).toBe("pending");
  ids.push(inserted.data!.id);
  const anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  expect((await anon.from("support_contributions").select("payment_reference")).error?.code).toBe("42501");
  expect((await anon.rpc("get_support_wall")).error?.code).toBe("42501");
  expect((await db.rpc("get_support_wall")).data.supporters).toEqual([]);

  const link = await db.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: "http://localhost:3200/auth/callback" } });
  if (link.error) throw link.error;
  await page.goto(`/auth/callback?token_hash=${link.data.properties.hashed_token}&type=email`);
  await page.goto("/admin/apoyos");
  const card = page.locator("article").filter({ hasText: reference });
  await expect(card.getByRole("button", { name: "Confirmar aporte" })).toBeDisabled();
  await card.getByLabel("Monto recibido en MXN").fill("45.50");
  await card.getByLabel("Nota privada de revisión").fill("Referencia y monto comprobados en fixture aislado");
  await card.getByLabel("Comprobé el identificador").check();
  await card.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(card).toHaveCount(0);
  const named = (await db.rpc("get_support_wall")).data;
  expect(named.confirmedCount).toBe(1);
  expect(named.supporters[0]).toMatchObject({ name: "Apoyo de prueba E2E", amount_cents: 4550 });
  expect(Object.keys(named.supporters[0]).sort()).toEqual(["amount_cents", "confirmed_at", "id", "name"]);

  for (const visibility of ["anonymous", "private"]) {
    const ref = `${run}-${visibility}`;
    const row = await db.from("support_contributions").insert({ method: "paypal", amount_cents: 10000, payment_reference: ref, reference_hash: createHash("sha256").update(ref).digest("hex"), visibility, show_amount: false }).select("id").single();
    if (row.error) throw row.error;
    ids.push(row.data.id);
    expect((await db.rpc("review_support_contribution", { p_id: row.data.id, p_revision: 1, p_status: "confirmed", p_amount_cents: 10000, p_note: "Pago de prueba", p_actor_id: userId })).error).toBeNull();
  }
  const wall = (await db.rpc("get_support_wall")).data;
  expect(wall.confirmedCount).toBe(2);
  expect(wall.supporters.find((row: { name: string }) => row.name === "Apoyo anónimo").amount_cents).toBeNull();
  expect(JSON.stringify(wall)).not.toContain(run);
  expect((await db.rpc("review_support_contribution", { p_id: ids[0], p_revision: 1, p_status: "rejected", p_amount_cents: 4550, p_note: "Conflicto", p_actor_id: userId })).error?.code).toBe("40001");
  expect((await db.rpc("review_support_contribution", { p_id: ids[0], p_revision: null, p_status: "rejected", p_amount_cents: 4550, p_note: "Nulo", p_actor_id: userId })).error?.code).toBe("22023");

  await page.goto("/apoyar");
  await expect(page.locator(".supporter-grid")).toContainText("Apoyo de prueba E2E");
  expect(await page.content()).not.toContain(reference);
  await page.goto("/");
  await expect(page.locator(".supporter-grid")).toContainText("Apoyo de prueba E2E");
  await page.goto("/admin/apoyos?estado=confirmed");
  const confirmed = page.locator("article").filter({ hasText: reference });
  await confirmed.getByLabel("Nota privada de revisión").fill("Retirado para comprobar la privacidad");
  await confirmed.getByRole("button", { name: "Retirar reconocimiento" }).click();
  await expect(confirmed).toHaveCount(0);
  expect((await db.from("support_contribution_reviews").select("id", { count: "exact" }).eq("contribution_id", ids[0])).count).toBe(2);
  expect((await db.rpc("get_support_wall")).data.confirmedCount).toBe(1);
  await page.goto("/apoyar");
  await expect(page.locator(".supporter-grid")).not.toContainText("Apoyo de prueba E2E");
});

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

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
  if (db) {
    await db.from("admin_members").delete().eq("email", email);
    if (userId) await db.auth.admin.deleteUser(userId);
  }
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

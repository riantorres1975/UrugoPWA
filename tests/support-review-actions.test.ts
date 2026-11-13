import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn(), rpc: vi.fn(), revalidate: vi.fn(), abort: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { reviewSupportContribution, registerVerifiedSupport, saveSupportGoal, rotateSupportAccess } from "@/app/admin/support-actions";
const id = "c3e26cd6-cb30-4b60-92ea-b523dd29b0f1";
const actor = "cadb24cb-365f-4bc8-bc73-fc30f2a980d9";
function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ id, revision: "1", status: "confirmed", amount: "50", verified: "on", note: "Cuenta revisada", ...overrides })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ status: "admin", userId: actor }); mocks.abort.mockResolvedValue({ error: null }); mocks.rpc.mockReturnValue({ abortSignal: mocks.abort }); mocks.db.mockReturnValue({ rpc: mocks.rpc }); });
describe("confirmación de apoyos", () => {
  it("exige autorización real y verificación explícita", async () => {
    mocks.access.mockResolvedValueOnce({ status: "denied" });
    expect(await reviewSupportContribution({}, form())).toHaveProperty("error");
    expect(await reviewSupportContribution({}, form({ verified: "" }))).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("guarda una revisión atómica con actor del servidor e invalida las páginas públicas", async () => {
    expect(await reviewSupportContribution({}, form({ actor_id: "forged" }))).toHaveProperty("success");
    expect(mocks.rpc).toHaveBeenCalledWith("review_support_contribution", { p_id: id, p_revision: 1, p_status: "confirmed", p_amount_cents: 5000, p_note: "Cuenta revisada", p_actor_id: actor });
    expect(mocks.revalidate.mock.calls.map(([path]) => path)).toEqual(["/", "/apoyar", "/admin/apoyos"]);
  });
  it("rechaza revisiones obsoletas y no publica si falla el guardado", async () => {
    mocks.abort.mockResolvedValueOnce({ error: { code: "40001" } });
    expect(await reviewSupportContribution({}, form())).toEqual({ error: expect.stringContaining("actualizó") });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(await reviewSupportContribution({}, form({ revision: "0" }))).toHaveProperty("error");
    expect(await reviewSupportContribution({}, form({ status: "rejected", note: "" }))).toHaveProperty("error");
  });
});
describe("nuevas herramientas de apoyo", () => {
  const code = "UG-" + "ab".repeat(24);
  const manual = (overrides: Record<string, string> = {}) => form({ method: "mercadopago", amount: "100", reference: "REFERENCE-TEST", visibility: "anonymous", note: "Comprobante verificado", accessCode: code, ...overrides });
  it("exige permiso de administrador en todas las acciones nuevas", async () => {
    mocks.access.mockResolvedValue({ status: "denied" });
    for (const action of [registerVerifiedSupport, saveSupportGoal, rotateSupportAccess]) expect(await action({}, manual())).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("el registro manual es anónimo sin monto público y exige consentimiento para nombres", async () => {
    expect(await registerVerifiedSupport({}, manual({ visibility: "named", name: "Ana" }))).toHaveProperty("error");
    expect(await registerVerifiedSupport({}, manual({ verified: "" }))).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(await registerVerifiedSupport({}, manual({ actor_id: "forged" }))).toMatchObject({ success: expect.any(String), accessCode: code });
    expect(mocks.rpc).toHaveBeenCalledWith("register_verified_support", { p_actor_id: actor, p_input: expect.objectContaining({ visibility: "anonymous", show_amount: false, name: null, management_hash: expect.stringMatching(/^[a-f0-9]{64}$/) }) });
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(code);
  });
  it("no publica metas ficticias ni sobrescribe una edición concurrente", async () => {
    expect(await saveSupportGoal({}, form({ month: "2026-99", target: "200", description: "Gastos comprobados de mantenimiento", revision: "0" }))).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
    const goal = form({ month: "2026-11", target: "200.50", description: "Gastos comprobados de mantenimiento", revision: "0", enabled: "on" });
    expect(await saveSupportGoal({}, goal)).toHaveProperty("success");
    expect(mocks.rpc).toHaveBeenCalledWith("save_support_monthly_goal", { p_month: "2026-11-01", p_target: 20050, p_description: "Gastos comprobados de mantenimiento", p_enabled: true, p_revision: 0, p_actor_id: actor });
    mocks.abort.mockResolvedValueOnce({ error: { code: "40001" } });
    expect(await saveSupportGoal({}, goal)).toEqual({ error: expect.stringContaining("cambió") });
  });
  it("el acceso de recuperación requiere comprobación y nunca guarda el código en claro", async () => {
    expect(await rotateSupportAccess({}, form())).toHaveProperty("error");
    const result = await rotateSupportAccess({}, form({ acknowledged: "on" }));
    expect(result.accessCode).toMatch(/^UG-[a-f0-9]{48}$/);
    expect(mocks.rpc).toHaveBeenCalledWith("rotate_support_access", { p_id: id, p_revision: 1, p_hash: expect.stringMatching(/^[a-f0-9]{64}$/), p_actor_id: actor });
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain(result.accessCode!);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn(), rpc: vi.fn(), revalidate: vi.fn(), abort: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { reviewSupportContribution } from "@/app/admin/support-actions";
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

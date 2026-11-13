import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), rpc: vi.fn(), abort: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
import { getSupportWall } from "@/lib/support-contributions-server";
beforeEach(() => { vi.clearAllMocks(); mocks.db.mockReturnValue({ rpc: mocks.rpc }); mocks.rpc.mockReturnValue({ abortSignal: mocks.abort }); });
describe("proyección pública de apoyos", () => {
  it("solo entrega campos autorizados, aunque cambie la respuesta de base de datos", async () => {
    mocks.abort.mockResolvedValue({ error: null, data: { confirmedCount: 1, supporters: [{ id: "1", name: "Anónimo", amount_cents: null, confirmed_at: "2026-11-13T10:00:00Z", payment_reference: "private-reference", method: "paypal", reviewed_by: "admin" }], privateTotal: 1000 } });
    expect(await getSupportWall()).toEqual({ confirmedCount: 1, supporters: [{ id: "1", name: "Anónimo", amount_cents: null, confirmed_at: "2026-11-13T10:00:00Z" }] });
  });
  it("distingue cero confirmado de indisponibilidad y no inventa aportaciones", async () => {
    mocks.abort.mockResolvedValueOnce({ error: null, data: { confirmedCount: 0, supporters: [] } });
    expect(await getSupportWall()).toEqual({ confirmedCount: 0, supporters: [] });
    mocks.db.mockReturnValueOnce(null); expect(await getSupportWall()).toBeNull();
    mocks.abort.mockResolvedValueOnce({ error: { code: "42P01" }, data: null }); expect(await getSupportWall()).toBeNull();
    mocks.abort.mockRejectedValueOnce(Error("offline")); expect(await getSupportWall()).toBeNull();
  });
  it("la meta pública conserva solo importe, avance y motivo autorizados", async () => {
    mocks.abort.mockResolvedValueOnce({ error: null, data: { confirmedCount: 0, supporters: [], goal: { month: "2026-11-01", target_cents: 10000, raised_cents: 2500, description: "Mantenimiento definido por el administrador", updated_by: "private", revision: 2 } } });
    expect((await getSupportWall())?.goal).toEqual({ month: "2026-11-01", target_cents: 10000, raised_cents: 2500, description: "Mantenimiento definido por el administrador" });
  });
});

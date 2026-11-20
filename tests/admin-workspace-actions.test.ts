import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorDraft } from "@/lib/admin-route-draft";
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn(), from: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { loadCloudDraft, saveCloudDraft, proposeRoadAlignment, simulateDraftJourney, resolveAdminReport } from "@/app/admin/workspace-actions";

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); mocks.db.mockReturnValue({ from: mocks.from }); });
afterEach(() => vi.unstubAllGlobals());
describe("permisos del espacio de trabajo", () => {
  it.each(["PT409", "40001"])("keeps a stale cloud draft intact and asks to reload for %s", async (code) => {
    mocks.access.mockResolvedValue({ status: "admin", userId: "admin" });
    const rpc = vi.fn().mockResolvedValue({ error: { code } });
    mocks.db.mockReturnValue({ rpc });
    const snapshot: EditorDraft = { routeId: 26, baseVersion: 3, reportId: null, savedAt: Date.now(),
      path: "[[-102.075,19.41],[-102.07,19.42]]", name: "Ruta 26", direction: "Ruta 26 (Ida)",
      color: "#abcdef", width: "500", operationalStatus: "active", summary: "Corrección del tramo", segment: null };
    expect(await saveCloudDraft(snapshot, 1)).toEqual({ error: expect.stringContaining("cambió en otro dispositivo") });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("todas las acciones rechazan una sesión no administrativa antes de usar el cliente privilegiado", async () => {
    mocks.access.mockResolvedValue({ status: "denied" });
    for (const action of [() => loadCloudDraft(1, "invalid"), () => saveCloudDraft({} as EditorDraft, 0),
      () => proposeRoadAlignment([[-102.07, 19.41], [-102.06, 19.42]]),
      () => simulateDraftJourney(1, "[]", [-102.07, 19.41], [-102.06, 19.42]),
      () => resolveAdminReport({ message: "", ok: false }, new FormData())]) {
      await expect(action()).rejects.toThrow("administrador");
    }
    expect(mocks.db).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("no envía coordenadas inválidas al proveedor ni cierra reportes sin explicación", async () => {
    mocks.access.mockResolvedValue({ status: "admin", userId: "admin" });
    expect(await proposeRoadAlignment([[-99, 20], [-102.06, 19.42]])).toHaveProperty("error");
    expect(await resolveAdminReport({ message: "", ok: false }, new FormData())).toMatchObject({ ok: false });
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
});

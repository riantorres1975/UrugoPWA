import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), client: vi.fn(), rpc: vi.fn(), tag: vi.fn(), path: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.client, createSupabaseSessionClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.path, revalidateTag: mocks.tag }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw Error(`REDIRECT ${url}`); } }));
import { publishRouteRevision } from "@/app/admin/actions";
import { PUBLISHED_ROUTES_CACHE_TAG } from "@/lib/public-data-cache";

const path = [[-102.08, 19.41], [-102.06, 19.42]];
function form() {
  const fields = { routeId: "17", expectedVersion: "1", name: "Ruta 17", originalName: "Ruta 17 Ida", color: "#abcdef", corridorWidthM: "500", operationalStatus: "active", path: JSON.stringify(path), changeSummary: "Recorrido confirmado con usuarios frecuentes." };
  const result = new FormData(); Object.entries(fields).forEach(([k, v]) => result.set(k, v)); return result;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.access.mockResolvedValue({ status: "admin", userId: "admin" });
  mocks.rpc.mockResolvedValue({ data: 2, error: null });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), delete: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { path, landmarks: [], verified: true }, error: null }) };
  mocks.client.mockReturnValue({ from: vi.fn(() => query), rpc: mocks.rpc });
});
describe("public route cache invalidation", () => {
  it("expires the catalog only after a successful authorized publication", async () => {
    await expect(publishRouteRevision({ status: "idle", message: "" }, form())).rejects.toThrow("REDIRECT /admin/routes/17?publicada=2");
    expect(mocks.tag).toHaveBeenCalledWith(PUBLISHED_ROUTES_CACHE_TAG, { expire: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith("publish_route_revision", expect.objectContaining({ p_route_id: 17, p_expected_version: 1 }));
  });
  it("does not invalidate data when publishing is denied or the revision is stale", async () => {
    mocks.access.mockResolvedValueOnce({ status: "denied" });
    expect(await publishRouteRevision({ status: "idle", message: "" }, form())).toMatchObject({ status: "error" });
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "revision conflict" } });
    expect(await publishRouteRevision({ status: "idle", message: "" }, form())).toMatchObject({ status: "error" });
    expect(mocks.tag).not.toHaveBeenCalled();
  });
});

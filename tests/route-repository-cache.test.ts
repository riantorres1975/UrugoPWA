import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), query: vi.fn(), cached: new Map<string, unknown>() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.client }));
vi.mock("@/lib/supabase/config", () => ({ getAdminSupabaseConfig: () => ({ url: "https://catalog-test.supabase.co" }) }));
vi.mock("next/cache", () => ({ unstable_cache: (load: () => Promise<unknown>, keys: string[]) => async () => {
  const key = JSON.stringify(keys); if (mocks.cached.has(key)) return mocks.cached.get(key);
  const result = await load(); mocks.cached.set(key, result); return result;
} }));
import { getPublishedRouteData } from "@/lib/route-repository";
const row = { id: 17, name: "Ruta 17", original_name: "Ruta 17 Ida", color: "#abcdef", corridor_width_m: 500, verified: true, last_verified_at: null,
  path: [[-102.08, 19.41], [-102.06, 19.42]], landmarks: [], updated_at: "2026-11-20T10:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks(); mocks.cached.clear(); vi.stubEnv("ROUTE_DATA_SOURCE", "supabase");
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), abortSignal: mocks.query };
  mocks.client.mockReturnValue({ from: vi.fn(() => query) });
  mocks.query.mockResolvedValue({ data: [row], error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("published catalog cache", () => {
  it("shares one validated database read across repeated and simultaneous readers", async () => {
    const [one, two] = await Promise.all([getPublishedRouteData(), getPublishedRouteData()]);
    expect(one).toEqual(two); expect(one).toMatchObject({ source: "supabase", routes: [{ id: 17 }] });
    await getPublishedRouteData(); expect(mocks.query).toHaveBeenCalledTimes(1);
  });
  it("does not cache the static backup after a database failure", async () => {
    mocks.query.mockResolvedValueOnce({ data: null, error: { message: "timeout" } });
    expect((await getPublishedRouteData()).source).toBe("static-fallback");
    expect((await getPublishedRouteData()).source).toBe("supabase");
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
  it("does not keep an invalid catalog in the cache", async () => {
    mocks.query.mockResolvedValueOnce({ data: [{ ...row, path: [["invalid", 19]] }], error: null });
    expect((await getPublishedRouteData()).source).toBe("static-fallback");
    expect((await getPublishedRouteData()).source).toBe("supabase");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ config: vi.fn(), cache: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ getAdminSupabaseConfig: mocks.config }));
vi.mock("next/cache", () => ({ unstable_cache: mocks.cache }));
import { cachePublicData, PUBLISHED_ROUTES_CACHE_TAG } from "@/lib/public-data-cache";

type Entry = { expires: number; value: unknown };
let entries: Map<string, Entry>;
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); entries = new Map();
  mocks.config.mockReturnValue({ url: "https://project-a.supabase.co" });
  mocks.cache.mockImplementation((load: () => Promise<unknown>, keys: string[], options: { revalidate: number }) => async () => {
    const key = JSON.stringify(keys), entry = entries.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;
    const value = await load();
    entries.set(key, { value, expires: Date.now() + options.revalidate * 1000 });
    return value;
  });
});
afterEach(() => vi.useRealTimers());

describe("shared cache for public database projections", () => {
  it("reuses a catalog across readers and revalidates after five minutes", async () => {
    const query = vi.fn().mockResolvedValue({ routes: [17], version: 1 });
    const firstReader = cachePublicData(PUBLISHED_ROUTES_CACHE_TAG, query);
    const anotherInstance = cachePublicData(PUBLISHED_ROUTES_CACHE_TAG, query);
    await firstReader(); await anotherInstance();
    expect(query).toHaveBeenCalledTimes(1);
    expect(mocks.cache).toHaveBeenCalledWith(query, [PUBLISHED_ROUTES_CACHE_TAG, "https://project-a.supabase.co"], { revalidate: 300, tags: [PUBLISHED_ROUTES_CACHE_TAG] });
    vi.advanceTimersByTime(300_001);
    await anotherInstance(); expect(query).toHaveBeenCalledTimes(2);
  });
  it("coalesces simultaneous cold reads without a database query per request", async () => {
    let finish!: (value: string) => void;
    const query = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const read = cachePublicData("aggregate", query);
    const one = read(), two = read(); finish("aggregate only");
    expect(await Promise.all([one, two])).toEqual(["aggregate only", "aggregate only"]);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("does not persist failed reads as an empty or fallback catalog", async () => {
    const query = vi.fn().mockRejectedValueOnce(Error("database unavailable")).mockResolvedValueOnce({ version: 2 });
    const read = cachePublicData("catalog", query);
    await expect(read()).rejects.toThrow("unavailable");
    await expect(read()).resolves.toEqual({ version: 2 });
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("keeps project caches separate when deployment configuration changes", async () => {
    const query = vi.fn().mockResolvedValueOnce("project A").mockResolvedValueOnce("project B");
    const read = cachePublicData("catalog", query);
    expect(await read()).toBe("project A");
    mocks.config.mockReturnValue({ url: "https://project-b.supabase.co" });
    expect(await read()).toBe("project B");
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("does not require Next's cache or store static fallback without Supabase configuration", async () => {
    mocks.config.mockReturnValue(null);
    const query = vi.fn().mockResolvedValue(null);
    const read = cachePublicData("catalog", query);
    await read(); await read();
    expect(mocks.cache).not.toHaveBeenCalled(); expect(query).toHaveBeenCalledTimes(2);
  });
});

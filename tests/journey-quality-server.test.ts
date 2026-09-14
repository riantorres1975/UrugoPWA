import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QualityVote } from "@/lib/journey-quality";

const mocks = vi.hoisted(() => ({ client: vi.fn(), page: vi.fn(), range: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.client }));

function vote(index: number): QualityVote {
  return { route_keys: ["a"], route_names: ["A"], device_hash: `device-${index}`,
    useful: false, reason: "bus_missing", feedback_day: "2026-09-12", updated_at: "2026-09-12T10:00:00Z" };
}

describe("server aggregation of journey opinions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    const query = {
      select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), range: mocks.range.mockReturnThis(), abortSignal: mocks.page,
    };
    mocks.client.mockReturnValue({ from: vi.fn(() => query) });
  });

  it("reads every page, deduplicates across pages and reuses only aggregates", async () => {
    mocks.page.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => vote(i)), error: null })
      .mockResolvedValueOnce({ data: [{ ...vote(0), useful: true, reason: null, updated_at: "2026-09-13T10:00:00Z" }, vote(1000)], error: null });
    const { loadJourneyQuality } = await import("@/lib/journey-quality-server");
    const [groups, simultaneous] = await Promise.all([loadJourneyQuality(), loadJourneyQuality()]);
    expect(groups).toEqual(simultaneous);
    expect(groups[0]).toMatchObject({ devices: 1001, negative: 1000, bus_missing: 1000 });
    expect(JSON.stringify(groups)).not.toContain("device-");
    expect(mocks.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(await loadJourneyQuality()).toEqual(groups);
    expect(mocks.page).toHaveBeenCalledTimes(2);
  });

  it("rejects a partial failed read and lets the next request retry", async () => {
    mocks.page.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => vote(i)), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "timeout" } })
      .mockResolvedValueOnce({ data: [], error: null });
    const { loadJourneyQuality } = await import("@/lib/journey-quality-server");
    await expect(loadJourneyQuality()).rejects.toThrow("No se pudo consultar");
    await expect(loadJourneyQuality()).resolves.toEqual([]);
  });

  it("refuses to turn a truncated sample into a quality signal", async () => {
    mocks.page.mockResolvedValue({ data: Array.from({ length: 1000 }, (_, i) => vote(i)), error: null });
    const { loadJourneyQuality } = await import("@/lib/journey-quality-server");
    await expect(loadJourneyQuality()).rejects.toThrow("límite de agregación");
    expect(mocks.page).toHaveBeenCalledTimes(50);
  });
});

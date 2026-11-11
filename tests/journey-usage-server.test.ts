import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.client }));
import { getJourneyUsage } from "@/lib/journey-usage-server";
import { feedbackPeriod } from "@/lib/journey-feedback-admin";
const period = feedbackPeriod("2026-11-01", "2026-11-10", new Date("2026-11-11T12:00:00Z"));

describe("uso del modo viaje para administración", () => {
  beforeEach(() => vi.clearAllMocks());
  it("agrega días completos sin limitarse a los primeros mil eventos", async () => {
    const query = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockResolvedValue({
        data: [{ activity_day: "2026-11-01", started: "1500", arrived: "300" }, { activity_day: "2026-11-02", started: 100, arrived: 90 }], error: null,
      }) };
    const from = vi.fn().mockReturnValue(query);
    mocks.client.mockReturnValue({ from });
    expect(await getJourneyUsage(period)).toMatchObject({ started: 1600, arrived: 390, days: [
      { day: "2026-11-01", started: 1500, arrived: 300 }, { day: "2026-11-02", started: 100, arrived: 90 },
    ] });
    expect(from).toHaveBeenCalledWith("trip_activity_daily");
    expect(query.gte).toHaveBeenCalledWith("activity_day", "2026-11-01");
    expect(query.lte).toHaveBeenCalledWith("activity_day", "2026-11-10");
    expect(query.limit).toHaveBeenCalledWith(366);
  });
  it("distingue cero viajes de un fallo de conexión", async () => {
    const query = { select: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), abortSignal: vi.fn() };
    mocks.client.mockReturnValue({ from: () => query });
    query.abortSignal.mockResolvedValue({ data: [], error: null });
    expect(await getJourneyUsage(period)).toEqual({ started: 0, arrived: 0, days: [] });
    query.abortSignal.mockResolvedValue({ data: null, error: { message: "network" } });
    expect(await getJourneyUsage(period)).toBeNull();
    mocks.client.mockReturnValue(null);
    expect(await getJourneyUsage(period)).toBeNull();
  });
});

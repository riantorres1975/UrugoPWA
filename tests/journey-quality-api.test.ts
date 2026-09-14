import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/lib/journey-quality-server", () => ({ loadJourneyQuality: mocks.load }));
import { GET } from "@/app/api/community/journey-quality/route";

describe("public journey signals", () => {
  beforeEach(() => vi.clearAllMocks());
  it("publishes only thresholded signals without device data or individual counts", async () => {
    const group = { route_keys: ["a"], route_names: ["A"], devices: 20, negative: 15, active_days: 3, bus_missing: 10, route_incorrect: 0, transfer_far: 0 };
    mocks.load.mockResolvedValue([group, { ...group, devices: 2, route_names: ["Private small sample"] }]);
    const response = await GET();
    const data = await response.json();
    expect(data.signals).toHaveLength(1);
    expect(data.signals[0].routeNames).toEqual(["A"]);
    expect(Object.keys(data.signals[0]).sort()).toEqual(["concern", "penalty", "routeNames"]);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=300");
  });
  it("fails neutrally without exposing internal errors", async () => {
    mocks.load.mockRejectedValue(new Error("private connection secret"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ signals: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

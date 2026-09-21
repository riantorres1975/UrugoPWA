import { describe, expect, it } from "vitest";
import { chooseTransferPoint, transferPointFinalists, transferPointExplanation } from "@/lib/transfer-points";
import { computeTransferOptionsFromPolylines } from "@/lib/transfers";
import { DEFAULT_JOURNEY_SETTINGS as settings } from "@/lib/journey-settings";
import type { PolylineRoute } from "@/lib/routeMatcher";

const point = (firstRideM: number, minutes: number, walk = 100) => ({
  firstRideM,
  cost: { originWalkM: 50, destinationWalkM: 50, transferWalkM: walk - 100,
    rideMinutes: minutes - walk / 75 - 10, waitMinutes: 10, transfers: 1 },
});

describe("choosing the transfer point", () => {
  it.each(["nearby", "balanced", "fastest"] as const)("prefers an earlier equivalent crossing for %s, regardless of iteration order", (preference) => {
    const early = point(500, 20.5, 125), late = point(2000, 20);
    expect(chooseTransferPoint([late, early], preference, settings)).toBe(early);
    expect(chooseTransferPoint([early, late], preference, settings)).toBe(early);
  });
  it("keeps the later crossing when the early one adds a detour", () => {
    const early = point(500, 25), late = point(2000, 20);
    expect(chooseTransferPoint([early, late], "nearby", settings)).toBe(late);
    expect(transferPointExplanation(late, [early, late])).toContain("reduce el tiempo");
  });
  it("keeps the later crossing when it saves substantial walking", () => {
    const early = point(500, 20, 200), late = point(2000, 20, 100);
    expect(chooseTransferPoint([early, late], "nearby", settings)).toBe(late);
    expect(transferPointExplanation(late, [early, late])).toContain("caminar menos");
  });
  it("does not break the walking limit to transfer earlier", () => {
    const early = point(500, 20, 310), late = point(2000, 20, 290);
    expect(chooseTransferPoint([early, late], "nearby", { ...settings, maxWalkM: 300 })).toBe(late);
  });
  it("does not increase walking when no crossing meets the walking limit", () => {
    const early = point(500, 20, 340), late = point(2000, 20, 310);
    expect(chooseTransferPoint([early, late], "nearby", { ...settings, maxWalkM: 300 })).toBe(late);
  });
  it("compares tolerances with a fixed baseline without chaining small losses", () => {
    const early = point(500, 21.6), middle = point(1000, 20.8), late = point(2000, 20);
    expect(chooseTransferPoint([early, middle, late], "fastest", settings)).toBe(middle);
  });
  it("keeps at most three candidates including the chosen and earliest points", () => {
    const early = point(500, 28, 160), close = point(2000, 24), fast = point(2500, 20, 160);
    const finalists = transferPointFinalists([fast, early, close], "fastest", settings);
    expect(finalists).toEqual([fast, early, close]);
    expect(transferPointExplanation(early, finalists)).toBeUndefined();
  });
  it("retains the baseline so street validation cannot compound the one-minute tolerance", () => {
    const early = point(500, 21.6, 110), preferred = point(1000, 20.8, 110);
    const closest = point(1500, 22, 100), baseline = point(2000, 20, 120);
    const finalists = transferPointFinalists([early, preferred, closest, baseline], "fastest", settings);
    expect(finalists).toContain(baseline);
    expect(chooseTransferPoint(finalists, "fastest", settings)).toBe(preferred);
  });
});

describe("routes crossing more than once", () => {
  const routes = (detour: number): PolylineRoute[] => [
    { id: 1, name: "A", color: "blue", corridor_width_m: 100, path: [[0, 0], [0.01, 0], [0.03, 0]] },
    { id: 2, name: "B", color: "green", corridor_width_m: 100,
      path: [[0.01, -0.01], [0.01, 0], [0.02, detour], [0.03, 0], [0.03, 0.02]] },
  ];
  it("selects the first crossing when switching later barely changes the total time", () => {
    const options = computeTransferOptionsFromPolylines(routes(0.004), [0, 0], [0.03, 0.018]);
    expect(options).toHaveLength(1);
    expect(options[0].transferPoint[0]).toBeLessThan(0.015);
    expect(options[0].alternativePoints!.length).toBeLessThanOrEqual(2);
    expect(options[0].alternativePoints!.every((p) => !p.alternativePoints)).toBe(true);
  });
  it("avoids the second bus's loop and retains an earlier point for street validation", () => {
    const options = computeTransferOptionsFromPolylines(routes(0.014), [0, 0], [0.03, 0.018]);
    expect(options[0].transferPoint[0]).toBeGreaterThan(0.025);
    expect(options[0].alternativePoints!.some((p) => p.transferPoint[0] < 0.015)).toBe(true);
  });
});

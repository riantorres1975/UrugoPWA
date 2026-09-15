import { describe, expect, it } from "vitest";
import { aggregateJourneyQuality, findQualitySignal, qualitySignal, type JourneyQualityGroup, type QualityVote } from "@/lib/journey-quality";
import { journeyMinutes, rankJourneys } from "@/lib/journey-ranking";

const group: JourneyQualityGroup = { route_keys: ["a", "b"], route_names: ["A", "B"], devices: 20, negative: 15, active_days: 3, bus_missing: 0, route_incorrect: 0, transfer_far: 8 };
describe("community calibration", () => {
  it.each(["boarding_far", "alighting_far", "walking_blocked"])("agrega %s sin convertir votos aislados en penalizaciones", (reason) => {
    const votes: QualityVote[] = Array.from({ length: 20 }, (_, index) => ({
      route_keys: ["a"], route_names: ["A"], device_hash: String(index), useful: false, reason,
      feedback_day: `2026-09-${10 + index % 3}`, updated_at: `2026-09-${10 + index % 3}T10:00:00Z`,
    }));
    expect(qualitySignal(aggregateJourneyQuality(votes)[0])?.concern).toBe(reason);
    expect(qualitySignal(aggregateJourneyQuality(votes.slice(0, 1))[0])).toBeNull();
  });
  it("requires enough devices, different days, negatives and a repeated reason", () => {
    expect(qualitySignal(group)?.concern).toBe("transfer_far");
    for (const change of [{ devices: 19 }, { active_days: 2 }, { negative: 11 }, { transfer_far: 4 }]) expect(qualitySignal({ ...group, ...change })).toBeNull();
  });
  it("counts only the latest vote per device and preserves the order of transfers", () => {
    const base: QualityVote = { route_keys: ["a", "b"], route_names: ["A", "B"], device_hash: "private-hash", useful: false, reason: "transfer_far", feedback_day: "2026-09-12", updated_at: "2026-09-12T10:00:00Z" };
    const groups = aggregateJourneyQuality([base, { ...base, useful: true, reason: null, updated_at: "2026-09-13T10:00:00Z", feedback_day: "2026-09-13" }, { ...base, route_keys: ["b", "a"], route_names: ["B", "A"] }]);
    expect(groups).toHaveLength(2);
    expect(groups.find((item) => item.route_keys[0] === "a")).toMatchObject({ devices: 1, negative: 0, transfer_far: 0 });
    expect(JSON.stringify(groups)).not.toContain("private-hash");
    expect(findQualitySignal([qualitySignal(group)!], ["B", "A"])).toBeUndefined();
  });
  it("uses a bounded preference adjustment and leaves ETA and fastest mode intact", () => {
    const cost = { originWalkM: 0, destinationWalkM: 0, transferWalkM: 0, rideMinutes: 10, waitMinutes: 5, transfers: 0 };
    const reported = { cost: { ...cost, reliabilityPenalty: 2 } };
    const alternative = { cost: { ...cost, rideMinutes: 11 } };
    expect(rankJourneys([reported, alternative], "balanced")[0]).toBe(alternative);
    expect(rankJourneys([reported, alternative], "fastest")[0]).toBe(reported);
    expect(journeyMinutes(reported.cost)).toBe(15);
    expect(qualitySignal({ ...group, negative: 20 })!.penalty).toBeLessThanOrEqual(2);
  });
});

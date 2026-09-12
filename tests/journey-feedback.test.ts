import { describe, expect, it } from "vitest";
import { parseJourneyFeedback } from "@/lib/journey-feedback";
import { feedbackPeriod, feedbackTotals } from "@/lib/journey-feedback-admin";

const payload = { deviceId: "00f5d066-1e55-49ca-bdb2-19fda6c8d4bf", routes: ["Ruta 26", "Ruta 85"], useful: false, reason: null };

describe("opiniones de viajes", () => {
  it("acepta ruta o transbordo y motivos opcionales", () => {
    expect(parseJourneyFeedback(payload)).toEqual(payload);
    expect(parseJourneyFeedback({ ...payload, reason: "transfer_far" })?.reason).toBe("transfer_far");
    expect(parseJourneyFeedback({ ...payload, routes: ["Ruta 26"], useful: true })?.useful).toBe(true);
  });
  it("rechaza votos y motivos inválidos", () => {
    for (const invalid of [null, [], { ...payload, routes: [] }, { ...payload, routes: ["Ruta 26", "Ruta 26"] }, { ...payload, useful: "si" }, { ...payload, deviceId: "test" }, { ...payload, reason: "__proto__" }, { ...payload, useful: true, reason: "other" }, { ...payload, routes: ["Ruta 26"], reason: "transfer_far" }]) {
      expect(parseJourneyFeedback(invalid)).toBeNull();
    }
  });
  it("incluye el último día y usa la fecha de Uruapan cerca de medianoche UTC", () => {
    expect(feedbackPeriod(undefined, undefined, new Date("2026-09-13T02:00:00Z"))).toMatchObject({ from: "2026-08-14", to: "2026-09-12", untilTimestamp: "2026-09-13T00:00:00-06:00" });
    expect(feedbackPeriod("2026-02-30", "2026-02-28", new Date("2026-09-13T02:00:00Z")).from).toBe("2026-01-30");
    expect(feedbackPeriod("2026-09-10", "2026-09-11", new Date("2026-09-13T02:00:00Z")).from).toBe("2026-09-10");
    expect(feedbackTotals([])).toEqual({ total: 0, positive: 0, negative: 0 });
  });
});

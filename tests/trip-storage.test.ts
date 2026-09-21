import { describe, expect, it } from "vitest";
import { createTripTrackingState, confirmTripStage, type DirectTripJourney } from "@/lib/trip-mode";
import { TRIP_EXPIRY_MS } from "@/lib/trip-storage";
import { parseSavedTrip } from "@/lib/trip-storage-parser";

const journey: DirectTripJourney = {
  kind: "direct", routeId: 1, routeName: "Centro", segment: [[-102.08, 19.42], [-102.06, 19.42]], destination: [-102.06, 19.423],
};
const now = 1_800_000_000_000;
const saved = { version: 1, savedAt: now, journey, tracking: confirmTripStage(journey, journey.segment[0], createTripTrackingState(), "board") };

describe("recuperación de viajes", () => {
  it("conserva el recorrido y etapa; reinicia las lecturas GPS", () => {
    const result = parseSavedTrip(JSON.stringify({ ...saved, tracking: { ...saved.tracking, offRouteReadings: 2, arrivalReadings: 1 } }), now);
    expect(result?.journey).toEqual(journey);
    expect(result?.tracking.progress?.phase).toBe("riding-direct");
    expect(result?.tracking.offRouteReadings).toBe(0);
    expect(result?.tracking.arrivalReadings).toBe(0);
    expect(result?.tracking.requireBoardingConfirmation).toBe(true);
  });
  it("conserva la confirmación pendiente al cerrar antes de subir", () => {
    const result = parseSavedTrip(JSON.stringify({ ...saved, tracking: { ...createTripTrackingState(), boardingConfirmation: "first" } }), now);
    expect(result?.tracking.boardingConfirmation).toBe("first");
  });
  it("rechaza viajes expirados, futuros o de otra versión", () => {
    expect(parseSavedTrip(JSON.stringify(saved), now + TRIP_EXPIRY_MS + 1)).toBeNull();
    expect(parseSavedTrip(JSON.stringify(saved), now - 60_001)).toBeNull();
    expect(parseSavedTrip(JSON.stringify({ ...saved, version: 2 }), now)).toBeNull();
  });
  it("rechaza geometría inválida y estados incoherentes", () => {
    for (const invalid of [
      { ...saved, journey: { ...journey, destination: [999, 999] } },
      { ...saved, journey: { ...journey, segment: [] } },
      { ...saved, tracking: { ...saved.tracking, boardingConfirmation: "second" } },
      { ...saved, tracking: { ...saved.tracking, progress: { ...saved.tracking.progress, phase: "arrived" } } },
      { ...saved, tracking: { ...saved.tracking, progress: { ...saved.tracking.progress, progressRatio: 2 } } },
    ]) expect(parseSavedTrip(JSON.stringify(invalid), now)).toBeNull();
    expect(parseSavedTrip("not json", now)).toBeNull();
    expect(parseSavedTrip(null, now)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { findNearestLandmark, findUpcomingLandmark } from "@/lib/landmark-guidance";
import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";

const path: Coordinates[] = [
  [-102.08, 19.42],
  [-102.07, 19.42],
  [-102.06, 19.42],
];
const landmarks: ProductionRouteLandmark[] = [
  { name: "Mercado", point: [-102.075, 19.4201] },
  { name: "Hospital", point: [-102.065, 19.4201] },
];

describe("landmark guidance", () => {
  it("elige la siguiente referencia en el sentido del recorrido", () => {
    const cue = findUpcomingLandmark([-102.072, 19.42], path, landmarks);
    expect(cue?.name).toBe("Hospital");
    expect(cue?.distanceM).toBeGreaterThan(600);
  });

  it("nombra el punto cercano para orientar un transbordo", () => {
    const cue = findNearestLandmark([-102.0651, 19.42], [landmarks], 100);
    expect(cue?.name).toBe("Hospital");
  });

  it.each([
    { longitude: -102.075, position: "en la referencia" },
    { longitude: -102.0748, position: "después de pasarla" },
    { longitude: -102.0752, position: "dentro del margen del GPS" },
  ])("avanza a Hospital $position", ({ longitude }) => {
    const cue = findUpcomingLandmark([longitude, 19.42], path, landmarks);
    expect(cue?.name).toBe("Hospital");
    expect(cue?.distanceM).toBeGreaterThan(400);
  });

  it("mantiene la referencia mientras todavía está por delante", () => {
    const cue = findUpcomingLandmark([-102.076, 19.42], path, landmarks);
    expect(cue?.name).toBe("Mercado");
    expect(cue?.distanceM).toBeGreaterThan(40);
  });

  it("deja de anunciar referencias cuando ya pasó la última", () => {
    expect(findUpcomingLandmark([-102.065, 19.42], path, landmarks)).toBeNull();
    expect(findUpcomingLandmark([-102.0648, 19.42], path, landmarks)).toBeNull();
  });

  it("respeta el sentido inverso del tramo seleccionado", () => {
    const cue = findUpcomingLandmark([-102.065, 19.42], [...path].reverse(), landmarks);
    expect(cue?.name).toBe("Mercado");
    expect(cue?.distanceM).toBeGreaterThan(1_000);
  });

  it("no anuncia una referencia fuera del tramo ni lejos del recorrido", () => {
    expect(findUpcomingLandmark([-102.072, 19.42], path.slice(0, 2), landmarks)).toBeNull();
    expect(findUpcomingLandmark([-102.072, 19.45], path, landmarks)).toBeNull();
  });
});

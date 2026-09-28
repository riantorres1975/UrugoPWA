import { describe, expect, it } from "vitest";
import { tripHref } from "@/lib/trip-links";
import { compareJourneys } from "@/lib/journey-comparison";
import { offlineJourneyHtml } from "@/lib/offline-journey";
import type { TripJourney } from "@/lib/trip-mode";

describe("herramientas de viaje cotidiano", () => {
  it("el regreso solo comparte extremos, nunca la ruta o segmentos de ida", () => {
    const url = new URL(tripHref([-102.06, 19.42], [-102.08, 19.43]), "https://urugo.app");
    expect([...url.searchParams.keys()]).toEqual(["a", "b"]);
    expect(url.searchParams.get("b")).toBe("-102.08,19.43");
  });
  it("compara costo y transbordos y muestra también las desventajas", () => {
    const cost = { originWalkM: 100, destinationWalkM: 100, transferWalkM: 0, rideMinutes: 15, waitMinutes: 5, transfers: 1 };
    const result = compareJourneys({ names: ["Ruta 2", "Ruta 20"], cost }, { names: ["Ruta 2"], cost: { ...cost, destinationWalkM: 350, rideMinutes: 25, transfers: 0 } });
    expect(result).toContain("Caminas ~250 m más");
    expect(result).toContain("$12 menos");
    expect(result).toContain("Evitas un transbordo");
    expect(result).toContain("~13 min más en total");
  });
  it("no inventa tiempos cuando no hay estimación", () => {
    expect(compareJourneys({ names: ["Ruta 2"] }, { names: ["Ruta 2"] })).toEqual(["Mismo costo"]);
  });
  it("la ficha incluye ambos abordajes sin scripts ni recursos externos", () => {
    const journey: TripJourney = { kind: "transfer", routeAId: 1, routeBId: 2, routeAName: "Ruta 2", routeBName: '<script>alert("x")</script>',
      segmentA: [[-102.08,19.42],[-102.07,19.42]], segmentB: [[-102.07,19.42],[-102.06,19.42]],
      destination: [-102.06,19.423], transferPoint: [-102.07,19.42], walkMeters: 20,
      routeAStartIndex: 0, routeATransferIndex: 1, routeBTransferIndex: 0, routeBEndIndex: 1 };
    const html = offlineJourneyHtml(journey);
    expect(html).toContain("S2"); expect(html).toContain("B2"); expect(html).toContain("20 m");
    expect(html).toContain("Coordenadas:"); expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script|https?:|src=/);
  });
});

import { describe, expect, it } from "vitest";
import { parseTripActivity } from "@/lib/trip-activity";

const now = Date.parse("2026-09-21T22:00:00Z");
const event = { id: "46ed4c46-a5d7-4988-80d2-b9b5fdc96765", routes: ["Ruta 17"], startedAt: new Date(now).toISOString(), arrived: false };
describe("actividad de viajes", () => {
  it("resuelve rutas canónicas sin conservar coordenadas ni campos adicionales", () => {
    expect(parseTripActivity({ ...event, location: [-102, 19] }, now)).toEqual({
      id: event.id, routeKeys: ["ruta-17-purhepechas"], startedAt: event.startedAt, arrived: false,
    });
    expect(parseTripActivity({ ...event, routes: ["Ruta 17", "Ruta 45"], arrived: true }, now)?.routeKeys).toHaveLength(2);
  });
  it("rechaza identidades, tiempos y rutas inválidos", () => {
    for (const invalid of [null, {}, { ...event, id: "x" }, { ...event, arrived: "true" },
      { ...event, routes: ["Ruta 999"] }, { ...event, routes: ["Ruta 17", "Ruta 17"] },
      { ...event, routes: [] }, { ...event, startedAt: new Date(now + 120_000).toISOString() },
      { ...event, startedAt: new Date(now - 86_400_001).toISOString() },
    ]) expect(parseTripActivity(invalid, now)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { createJourneySnapshot, isJourneySnapshot, journeyFreshness, routeSignature, savedJourneyHref, type JourneyCatalog } from "@/lib/offline-journey-freshness";
import type { ProductionRoute } from "@/lib/types";
import type { TripJourney } from "@/lib/trip-mode";

const route: ProductionRoute = { id: 1, name: "Ruta 1", original_name: "Ruta 1 Ida", color: "#fff", corridor_width_m: 200,
  verified: true, path: [[-102.06, 19.42], [-102.05, 19.43]], landmarks: [] };
const journey: TripJourney = { kind: "direct", routeId: 1, routeName: route.name, segment: route.path,
  origin: [-102.061, 19.419], destination: [-102.049, 19.431] };
const now = Date.parse("2026-11-11T12:00:00Z");

describe("vigencia de fichas guardadas", () => {
  it("conserva los puntos para recalcular y detecta un cambio real de recorrido", async () => {
    const snapshot = await createJourneySnapshot(journey, [route]);
    expect(isJourneySnapshot(snapshot)).toBe(true);
    const catalog: JourneyCatalog = { source: "supabase", routes: [{ id: 1, signature: await routeSignature(route) }], fares: { bus: 12, teleferico: 12 } };
    expect(journeyFreshness(snapshot, now, catalog, now).message).toContain("sin cambios en el catálogo");
    // A new field verification or a color change does not change travel instructions.
    const verifiedAgain = { ...route, color: "#000", verified: false };
    expect(await routeSignature(verifiedAgain)).toBe(snapshot.routes[0].signature);
    catalog.routes[0].signature = await routeSignature({ ...route, path: [...route.path, [-102.04, 19.44]] });
    expect(journeyFreshness(snapshot, now, catalog, now)).toMatchObject({ changed: true });
    expect(journeyFreshness(snapshot, now, catalog, now).message).toContain("recorrido o sus referencias cambiaron");
    const url = new URL(savedJourneyHref(snapshot), "https://www.urugo.app");
    expect(url.searchParams.get("a")).toBe(journey.origin!.join(","));
    expect(url.searchParams.get("b")).toBe(journey.destination.join(","));
    expect(url.searchParams.has("guardados")).toBe(false);
  });
  it("detecta tarifas, referencias modificadas y rutas retiradas", async () => {
    const snapshot = await createJourneySnapshot(journey, [route]);
    const catalog: JourneyCatalog = { source: "supabase", routes: [{ id: 1, signature: snapshot.routes[0].signature }], fares: { bus: 14, teleferico: 12 } };
    expect(journeyFreshness(snapshot, now, catalog, now).message).toContain("de $12 a $14");
    catalog.fares.bus = 12;
    catalog.routes[0].signature = await routeSignature({ ...route, landmarks: [{ name: "Nueva parada", point: route.path[0] }] });
    expect(journeyFreshness(snapshot, now, catalog, now).changed).toBe(true);
    catalog.routes = [];
    expect(journeyFreshness(snapshot, now, catalog, now).changed).toBe(true);
  });
  it("mantiene las fichas antiguas y distingue falta de conexión de vigencia confirmada", async () => {
    const snapshot = await createJourneySnapshot(journey, [route]);
    expect(journeyFreshness(undefined, now, null, now).message).toContain("ficha antigua");
    expect(journeyFreshness(snapshot, now, null, now).message).toContain("No se pudieron comprobar");
    const fallback: JourneyCatalog = { source: "static-fallback", routes: [], fares: { bus: 12, teleferico: 12 } };
    expect(journeyFreshness(snapshot, now, fallback, now).changed).toBe(false);
    expect(journeyFreshness(snapshot, now, fallback, now).message).toContain("No se pudo consultar el catálogo publicado");
    const catalog = { ...fallback, source: "static" as const, routes: snapshot.routes };
    expect(journeyFreshness(snapshot, now - 8 * 86400000, catalog, now).message).toContain("más de 7 días");
  });
  it("suma tarifas del camión y Teleférico y no guarda una ruta ausente", async () => {
    const cable = { ...route, id: 2, name: "Teleférico Uruapan" };
    const transfer: TripJourney = { kind: "transfer", routeAId: 1, routeBId: 2, routeAName: route.name, routeBName: cable.name,
      routeAStartIndex: 0, routeATransferIndex: 1, routeBTransferIndex: 0, routeBEndIndex: 1,
      segmentA: route.path, segmentB: route.path, transferPoint: route.path[1], walkMeters: 0, destination: journey.destination };
    const snapshot = await createJourneySnapshot(transfer, [route, cable]);
    expect(snapshot.fareMxn).toBe(24);
    expect(snapshot.routes.map((r) => r.mode)).toEqual(["bus", "teleferico"]);
    expect(journeyFreshness(snapshot, now, { source: "static", routes: snapshot.routes, fares: { bus: 12, teleferico: 15 } }, now).message).toContain("de $24 a $27");
    await expect(createJourneySnapshot(transfer, [route])).rejects.toThrow("Vuelve a calcular");
    expect(isJourneySnapshot({ ...snapshot, destination: [Infinity, 19] })).toBe(false);
  });
});

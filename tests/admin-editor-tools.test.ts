import { describe, expect, it } from "vitest";
import { routeDiff } from "@/lib/admin-route-diff";
import { parseRoadAlignment } from "@/lib/admin-road-alignment";
import type { Coordinates } from "@/lib/types";
const a: Coordinates = [-102.07, 19.41], b: Coordinates = [-102.06, 19.41], c: Coordinates = [-102.05, 19.41], d: Coordinates = [-102.06, 19.42];
describe("revisión de cambios de recorrido", () => {
  it("conserva los segmentos iguales y aísla el tramo sustituido", () => {
    const diff = routeDiff([a, b, c], [a, b, d, c]);
    expect(diff.removed).toEqual([[b, c]]); expect(diff.added).toEqual([[b, d], [d, c]]); expect(diff.deltaM).toBeGreaterThan(0);
  });
  it("detecta inversión de sentido y conserva multiplicidad al repetir una calle", () => {
    expect(routeDiff([a, b], [b, a]).removed).toEqual([[a, b]]);
    expect(routeDiff([a, b, a, b], [a, b]).removed).toEqual([[b, a], [a, b]]);
  });
  it("una ruta idéntica no tiene cambios", () => { expect(routeDiff([a, b], [a, b])).toEqual({ removed: [], added: [], deltaM: 0 }); });
});
describe("propuesta de calles", () => {
  const response = (coordinates: Coordinates[]) => ({ code: "Ok", routes: [{ geometry: { type: "LineString", coordinates } }] });
  it("mantiene A/B originales fuera de los puntos intermedios", () => { expect(parseRoadAlignment(response([a, d, b]), a, b)).toEqual([d]); });
  it("rechaza respuestas sin ruta, fuera de Uruapan o lejos de las conexiones", () => {
    expect(parseRoadAlignment({ code: "NoRoute" }, a, b)).toBeNull();
    expect(parseRoadAlignment(response([c, d]), a, b)).toBeNull();
    expect(parseRoadAlignment(response([[-99, 19], b]), a, b)).toBeNull();
    expect(parseRoadAlignment(null, a, b)).toBeNull();
  });
});

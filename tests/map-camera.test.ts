import { describe, expect, it } from "vitest";
import { getInitialMapBounds } from "@/lib/map";
import { getSafeCameraPadding } from "@/lib/map-camera";
import type { RouteData } from "@/lib/types";

const routes: RouteData[] = [{
  id: 1,
  nombre: "Ruta extensa",
  color: "#2563eb",
  coordenadas: [
    [-102.12, 19.35],
    [-102.01, 19.47],
  ],
}];

describe("camera padding with the mobile keyboard", () => {
  const requested = { top: 220, bottom: 200, left: 48, right: 48 };

  it.each([360, 420, 421, 425, 800])("reserves space for the journey at %i px high", (height) => {
    const padding = getSafeCameraPadding(400, height, requested);
    expect(height - padding.top - padding.bottom).toBeGreaterThanOrEqual(height / 2);
    expect(padding.top / padding.bottom).toBeCloseTo(1.1);
    expect(padding.left).toBe(48);
  });

  it("preserves margins when enough space is available", () => {
    expect(getSafeCameraPadding(1200, 1000, requested)).toEqual(requested);
  });

  it("also protects narrow containers and allows zero margins", () => {
    const padding = getSafeCameraPadding(100, 300, requested);
    expect(padding.left + padding.right).toBe(50);
    expect(getSafeCameraPadding(100, 100, { top: 0, bottom: 0, left: 0, right: 0 }))
      .toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

describe("initial map camera", () => {
  it("prioriza origen y destino disponibles antes de que cargue el mapa", () => {
    const origin: [number, number] = [-102.06303, 19.42101];
    const destination: [number, number] = [-102.058, 19.425];

    expect(getInitialMapBounds({
      destination,
      hasSelectedJourney: false,
      origin,
      routes,
    })).toEqual({
      bounds: [origin, destination],
      target: "journey",
    });
  });

  it("mantiene el encuadre general cuando todavía no hay viaje", () => {
    expect(getInitialMapBounds({
      destination: null,
      hasSelectedJourney: false,
      origin: [-102.06303, 19.42101],
      routes,
    })).toEqual({
      bounds: [[-102.12, 19.35], [-102.01, 19.47]],
      target: "routes",
    });
  });
});

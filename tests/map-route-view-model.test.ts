import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useMapRouteViewModel } from "@/hooks/useMapRouteViewModel";
import type { RouteOption } from "@/lib/route-calculation";
import type { Coordinates, ProductionRoute } from "@/lib/types";

const route: ProductionRoute = {
  id: 26,
  name: "Ruta 26",
  original_name: "Ruta 26 Ida",
  color: "#635bdf",
  corridor_width_m: 100,
  verified: true,
  path: [[-102.03, 19.39], [-102.03, 19.40], [-102.04, 19.42], [-102.05, 19.43]],
  landmarks: [],
};
const segment = route.path.slice(1, 3);
const suggestion: RouteOption = {
  routeId: route.id,
  ruta: route.name,
  direccion: "ida",
  distanciaA: 20,
  distanciaB: 30,
  indexA: 1,
  indexB: 2,
  segment,
  rideMinutes: 10,
  expectedWaitMinutes: 5,
  estimatedMinutes: 17,
  score: 1,
};

function renderViewModel(overrides: Partial<Parameters<typeof useMapRouteViewModel>[0]> = {}) {
  let result!: ReturnType<typeof useMapRouteViewModel>;
  function CaptureViewModel() {
    result = useMapRouteViewModel({
      origin: segment[0],
      destination: segment[1],
      routes: [route],
      selectedRouteId: null,
      selectedTransfer: null,
      sharedRouteSegment: null,
      sharedSegmentColor: null,
      suggestions: [suggestion],
      ...overrides,
    });
    return null;
  }
  renderToStaticMarkup(createElement(CaptureViewModel));
  return result;
}

describe("direct journey map rendering", () => {
  it("renders only the recommended boarding-to-alighting segment without a catalog selection", () => {
    const view = renderViewModel();
    expect(view.selectedRoute).toBeNull();
    expect(view.selectedMapSegment).toEqual(segment);
    expect(view.arrowSegments).toEqual([{ coords: segment, color: route.color, showLine: true }]);
    expect(view.arrowSegments[0].coords).not.toContainEqual(route.path[0]);
    expect(view.arrowSegments[0].coords).not.toContainEqual(route.path[3]);
  });

  it("updates the displayed journey after an alternative replaces a previously viewed suggestion", () => {
    const replacement: Coordinates[] = [[-102.031, 19.40], [-102.041, 19.42]];
    const view = renderViewModel({
      sharedRouteSegment: segment,
      sharedSegmentColor: route.color,
      suggestions: [{ ...suggestion, routeId: 50, segment: replacement, routeColor: "#ef4444" }],
    });
    expect(view.selectedMapSegment).toEqual(replacement);
    expect(view.arrowSegments).toEqual([{ coords: replacement, color: "#ef4444", showLine: true }]);
  });

  it("uses the selected suggestion when another route is recommended first", () => {
    const view = renderViewModel({
      selectedRouteId: route.id,
      suggestions: [{ ...suggestion, routeId: 50, segment: [] }, suggestion],
    });
    expect(view.mapRoutes[0].coordenadas).toEqual(segment);
    expect(view.arrowSegments).toEqual([{ coords: segment, color: route.color, showLine: false }]);
  });

  it("retains the full route when browsing the catalog without a journey", () => {
    const view = renderViewModel({ origin: null, destination: null, suggestions: [], selectedRouteId: route.id });
    expect(view.selectedMapSegment).toBeNull();
    expect(view.mapRoutes[0].coordenadas).toEqual(route.path);
    expect(view.arrowSegments).toEqual([{ coords: route.path, color: route.color, showLine: true }]);
  });

  it("retains a shared segment when there is no calculated suggestion", () => {
    const view = renderViewModel({ suggestions: [], sharedRouteSegment: segment, sharedSegmentColor: route.color });
    expect(view.selectedMapSegment).toEqual(segment);
    expect(view.arrowSegments).toEqual([{ coords: segment, color: route.color, showLine: true }]);
  });

  it("draws both transfer legs without retaining the direct journey segment", () => {
    const segmentB: Coordinates[] = [segment[1], [-102.05, 19.45]];
    const view = renderViewModel({
      sharedRouteSegment: segment,
      sharedSegmentColor: route.color,
      selectedTransfer: {
        routeAId: route.id, routeBId: 85,
        routeAName: route.name, routeBName: "Ruta 85",
        routeAStartIndex: 1, routeATransferIndex: 2,
        routeBTransferIndex: 0, routeBEndIndex: 1,
        transferPoint: segment[1],
        segmentA: segment, segmentB,
        walkMeters: 20, score: 1,
      },
    });
    expect(view.selectedMapSegment).toBeNull();
    expect(view.arrowSegments).toEqual([
      { coords: segment, color: "#60a5fa", showLine: false },
      { coords: segmentB, color: "#34d399", showLine: false },
    ]);
  });
});

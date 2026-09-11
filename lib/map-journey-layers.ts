import type mapboxgl from "mapbox-gl";
import type { FeatureCollection } from "geojson";
import { buildJourneyDetails } from "@/lib/map-journey-geometry";
import type { MapArrowSegment } from "@/lib/map-route-view";
import type { Coordinates } from "@/lib/types";

const SOURCE = "arrows-source";
const DETAILS = "journey-details";
const ICON = "uru-chevron-fine";

function ensureChevron(map: mapboxgl.Map) {
  if (map.hasImage(ICON)) return;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) return;
  // The right-pointing chevron follows the line's direction under map rotation.
  context.strokeStyle = "white";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(18, 12);
  context.lineTo(30, 24);
  context.lineTo(18, 36);
  context.stroke();
  map.addImage(ICON, context.getImageData(0, 0, 48, 48));
}

function updateSource(map: mapboxgl.Map, id: string, data: FeatureCollection) {
  const source = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
  if (source) source.setData(data);
  else map.addSource(id, { type: "geojson", data });
}

export function renderJourneyLayers(
  map: mapboxgl.Map,
  segments: MapArrowSegment[],
  origin: Coordinates | null,
  destination: Coordinates | null,
  active: boolean,
  transfer: boolean,
) {
  ensureChevron(map);
  updateSource(map, SOURCE, {
    type: "FeatureCollection",
    features: segments.filter((segment) => segment.coords.length >= 2).map((segment) => ({
      type: "Feature", properties: { color: segment.color },
      geometry: { type: "LineString", coordinates: segment.coords },
    })),
  });
  updateSource(map, DETAILS, buildJourneyDetails(segments, origin, destination, active, transfer));

  const layers: mapboxgl.AnyLayer[] = [
    {
      id: "journey-walk-casing", type: "line", source: DETAILS,
      filter: ["==", ["get", "kind"], "walk"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 4.5, "line-opacity": 0.85 },
    },
    {
      id: "journey-walk", type: "line", source: DETAILS,
      filter: ["==", ["get", "kind"], "walk"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#64748b", "line-width": 2.5, "line-dasharray": [0.1, 2.2] },
    },
    {
      id: "arrows-casing", type: "line", source: SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 },
    },
    {
      id: "arrows-line", type: "line", source: SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 4.5 },
    },
    {
      id: "arrows-layer", type: "symbol", source: SOURCE,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11, 110, 14, 150, 17, 190],
        "icon-image": ICON,
        "icon-rotation-alignment": "map", "icon-pitch-alignment": "map",
        "icon-allow-overlap": true, "icon-ignore-placement": true,
        "icon-keep-upright": false, "icon-padding": 8,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.3, 14, 0.36, 17, 0.44],
      },
      paint: { "icon-opacity": 0.95 },
    },
    {
      id: "journey-stops", type: "circle", source: DETAILS,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-radius": ["case", ["==", ["get", "kind"], "transfer"], 6, 4.5],
        "circle-color": "#ffffff", "circle-stroke-color": ["get", "color"], "circle-stroke-width": 2.5,
      },
    },
    {
      id: "journey-stop-labels", type: "symbol", source: DETAILS, minzoom: 13.5,
      filter: ["==", ["geometry-type"], "Point"],
      layout: {
        "text-field": ["get", "label"], "text-size": 11,
        "text-anchor": "top", "text-offset": [0, 1], "text-padding": 8,
      },
      paint: { "text-color": "#334155", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    },
    {
      id: "journey-walk-labels", type: "symbol", source: DETAILS, minzoom: 13.5,
      filter: ["==", ["get", "kind"], "walk"],
      layout: { "symbol-placement": "line-center", "text-field": ["get", "label"], "text-size": 10, "text-offset": [0, -1], "text-padding": 6 },
      paint: { "text-color": "#475569", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    },
  ];
  for (const layer of layers) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
}

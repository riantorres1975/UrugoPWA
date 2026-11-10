"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { GeoJSONSource, Map } from "mapbox-gl";
import type { RouteSegmentDraft } from "@/lib/admin-route";
import { getBoundsFromCoordinates, getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";

type Props = {
  published: Coordinates[];
  draft: Coordinates[];
  relatedPaths: Coordinates[][];
  directionLabel: string;
  showPublished: boolean;
  showRelated: boolean;
  selected: number | null;
  insertionSegment: number | null;
  segment: RouteSegmentDraft | null;
  placing: boolean;
  onPick: (point: Coordinates, index: number | null) => void;
};

function geometry(points: Coordinates[], edit?: Pick<Props, "selected" | "insertionSegment" | "segment">): FeatureCollection<LineString | Point> {
  const { selected, insertionSegment, segment } = edit ?? {};
  const start = segment?.start;
  const end = segment?.end;
  const drawing = start != null && end != null;
  const paths = drawing ? [points.slice(0, Math.min(start, end) + 1), points.slice(Math.max(start, end))] : [points];
  const features = paths.flatMap<Feature<LineString | Point>>((path) => path.length >= 2
    ? [{ type: "Feature", properties: { kind: "route" }, geometry: { type: "LineString", coordinates: path } }]
    : []);
  if (insertionSegment != null && points[insertionSegment] && points[insertionSegment + 1]) {
    features.push({
      type: "Feature",
      properties: { kind: "insertion" },
      geometry: { type: "LineString", coordinates: [points[insertionSegment], points[insertionSegment + 1]] },
    });
  }
  if (drawing && segment?.points.length) {
    features.push({
      type: "Feature",
      properties: { kind: "replacement" },
      geometry: { type: "LineString", coordinates: [points[start], ...segment.points, points[end]] },
    });
  }
  if (edit) {
    points.forEach((point, index) => {
      const connection = index === start ? "start" : index === end ? "end" : null;
      if (drawing && !connection) return;
      features.push({
        type: "Feature",
        properties: { selected: index === selected || !!connection, connection },
        geometry: { type: "Point", coordinates: point },
      });
    });
  }
  return { type: "FeatureCollection", features };
}

function relatedGeometry(paths: Coordinates[][]): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: paths.map((path) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: path },
    })),
  };
}

export default function AdminRouteMap(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const latest = useRef(props);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    latest.current = props;
    const map = mapRef.current;
    const draft = map?.getSource<GeoJSONSource>("draft");
    draft?.setData(geometry(props.draft, props));
    if (map) map.getCanvas().style.cursor = props.placing ? "crosshair" : "grab";
  }, [props]);

  const { relatedPaths, showPublished, showRelated } = props;
  useEffect(() => {
    mapRef.current?.getSource<GeoJSONSource>("related-directions")?.setData(relatedGeometry(relatedPaths));
  }, [relatedPaths]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("published")) map.setLayoutProperty("published", "visibility", showPublished ? "visible" : "none");
    if (map?.getLayer("related-directions")) map.setLayoutProperty("related-directions", "visibility", showRelated ? "visible" : "none");
  }, [showPublished, showRelated]);

  useEffect(() => {
    let disposed = false;
    const timeout = window.setTimeout(() => setStatus("error"), 15000);

    async function initialize() {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) throw new Error("Mapbox no está configurado.");
        const { default: mapbox } = await import("mapbox-gl");
        if (disposed || !containerRef.current) return;
        const map = new mapbox.Map({
          accessToken: token, container: containerRef.current, style: getMapStyle(false),
          center: URUAPAN_CENTER, zoom: 12.5, attributionControl: true,
          projection: "mercator",
        });
        mapRef.current = map;
        map.addControl(new mapbox.NavigationControl({ showCompass: false }));
        map.on("load", () => {
          const { published, draft, relatedPaths, showPublished, showRelated } = latest.current;
          map.addSource("published", { type: "geojson", data: geometry(published) });
          map.addSource("related-directions", { type: "geojson", data: relatedGeometry(relatedPaths) });
          map.addSource("draft", { type: "geojson", data: geometry(draft, latest.current) });
          map.addLayer({
            id: "related-directions", type: "line", source: "related-directions",
            paint: { "line-color": "#0f766e", "line-width": 4, "line-dasharray": [2, 1.5] },
            layout: { "visibility": showRelated ? "visible" : "none", "line-join": "round", "line-cap": "round" },
          });
          map.addLayer({
            id: "published", type: "line", source: "published",
            paint: { "line-color": "#2563eb", "line-width": 6, "line-dasharray": [2, 1.5] },
            layout: { "visibility": showPublished ? "visible" : "none", "line-join": "round", "line-cap": "round" },
          });
          map.addLayer({
            id: "draft", type: "line", source: "draft", filter: ["==", ["get", "kind"], "route"],
            paint: { "line-color": "#795400", "line-width": 4 },
            layout: { "line-join": "round", "line-cap": "round" },
          });
          map.addLayer({
            id: "insertion", type: "line", source: "draft", filter: ["==", ["get", "kind"], "insertion"],
            paint: { "line-color": "#6d28d9", "line-width": 6 },
            layout: { "line-join": "round", "line-cap": "round" },
          });
          map.addLayer({
            id: "replacement", type: "line", source: "draft", filter: ["==", ["get", "kind"], "replacement"],
            paint: { "line-color": "#6d28d9", "line-width": 5 },
            layout: { "line-join": "round", "line-cap": "round" },
          });
          map.addLayer({
            id: "vertices", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": ["case", ["get", "selected"], 8, 4],
              "circle-color": ["case", ["==", ["get", "connection"], "end"], "#ffbe65", ["get", "selected"], "#d4f977", "#fff4cb"],
              "circle-stroke-width": 2, "circle-stroke-color": "#473306",
            },
          });
          const points = [...published, ...draft];
          if (points.length) map.fitBounds(getBoundsFromCoordinates(points), { padding: 34, maxZoom: 16, duration: 0 });
          map.getCanvas().style.cursor = latest.current.placing ? "crosshair" : "grab";
          window.clearTimeout(timeout);
          setStatus("ready");
        });
        map.on("click", (event) => {
          if (!map.getLayer("vertices")) return;
          const { onPick, placing, draft } = latest.current;
          const coordinate: Coordinates = [Number(event.lngLat.lng.toFixed(6)), Number(event.lngLat.lat.toFixed(6))];
          if (placing) {
            onPick(coordinate, null);
            return;
          }

          // Read from the current draft while the GeoJSON source finishes redrawing.
          let index: number | null = null;
          let nearest = 14;
          draft.forEach((point, candidate) => {
            const screen = map.project(point);
            const distance = Math.hypot(screen.x - event.point.x, screen.y - event.point.y);
            if (distance < nearest) {
              nearest = distance;
              index = candidate;
            }
          });
          if (index !== null) onPick(coordinate, index);
        });
      } catch {
        window.clearTimeout(timeout);
        if (!disposed) setStatus("error");
      }
    }

    void initialize();
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-[340px] bg-[var(--brand-header)] sm:h-[460px]">
      <div ref={containerRef} aria-label="Mapa del recorrido" className="absolute inset-0" />
      {status === "ready" && (
        <span className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-80px)] rounded-lg bg-[var(--brand-header)] px-2.5 py-1.5 text-xs font-bold text-[var(--brand-lime)] [overflow-wrap:anywhere]">
          Editando {props.directionLabel}
        </span>
      )}
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--brand-header)] p-5 text-center text-sm text-[var(--admin-muted)]" role="status">
          {status === "loading" ? "Cargando el mapa…" : "No se pudo cargar el mapa. Puedes seguir editando desde Coordenadas avanzadas."}
        </div>
      )}
    </div>
  );
}

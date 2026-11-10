"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { GeoJSONSource, Map } from "mapbox-gl";
import { getBoundsFromCoordinates, getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";

type Props = {
  published: Coordinates[];
  draft: Coordinates[];
  selected: number | null;
  insertionSegment: number | null;
  placing: boolean;
  onPick: (point: Coordinates, index: number | null) => void;
};

function geometry(points: Coordinates[], vertices = false, selected: number | null = null, insertionSegment: number | null = null): FeatureCollection<LineString | Point> {
  const features: Feature<LineString | Point>[] = points.length >= 2
    ? [{ type: "Feature", properties: { kind: "route" }, geometry: { type: "LineString", coordinates: points } }]
    : [];
  if (insertionSegment !== null && points[insertionSegment] && points[insertionSegment + 1]) {
    features.push({
      type: "Feature",
      properties: { kind: "insertion" },
      geometry: { type: "LineString", coordinates: [points[insertionSegment], points[insertionSegment + 1]] },
    });
  }
  if (vertices) {
    points.forEach((point, index) => features.push({
      type: "Feature",
      properties: { selected: index === selected },
      geometry: { type: "Point", coordinates: point },
    }));
  }
  return { type: "FeatureCollection", features };
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
    draft?.setData(geometry(props.draft, true, props.selected, props.insertionSegment));
    if (map) map.getCanvas().style.cursor = props.placing ? "crosshair" : "grab";
  }, [props]);

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
          const { published, draft, selected, insertionSegment } = latest.current;
          map.addSource("published", { type: "geojson", data: geometry(published) });
          map.addSource("draft", { type: "geojson", data: geometry(draft, true, selected, insertionSegment) });
          map.addLayer({
            id: "published", type: "line", source: "published",
            paint: { "line-color": "#2563eb", "line-width": 8, "line-opacity": 0.75 },
            layout: { "line-join": "round", "line-cap": "round" },
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
            id: "vertices", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": ["case", ["get", "selected"], 8, 4],
              "circle-color": ["case", ["get", "selected"], "#d4f977", "#fff4cb"],
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
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-[var(--brand-header)] p-5 text-center text-sm text-[var(--admin-muted)]" role="status">
          {status === "loading" ? "Cargando el mapa…" : "No se pudo cargar el mapa. Puedes seguir editando desde Coordenadas avanzadas."}
        </div>
      )}
    </div>
  );
}

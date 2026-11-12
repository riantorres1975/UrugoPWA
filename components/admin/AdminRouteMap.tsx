"use client";

import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { GeoJSONSource, Map, Marker } from "mapbox-gl";
import type { RouteSegmentDraft } from "@/lib/admin-route";
import { getBoundsFromCoordinates, getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";
import { routeDiff } from "@/lib/admin-route-diff";
import type { EditorOverlay, JourneyTestPoints } from "@/components/admin/RouteEditorTools";

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
  focus?: Coordinates | null;
  comparison?: boolean;
  overlay?: EditorOverlay | null;
  testPoints?: JourneyTestPoints;
  onPick: (point: Coordinates, index: number | null) => void;
};

function reviewGeometry(props: Props): FeatureCollection<LineString | Point> {
  const features: Feature<LineString | Point>[] = [];
  const line = (path: Coordinates[], kind: string, color: string) => { if (path.length > 1) features.push({ type: "Feature", properties: { kind, color }, geometry: { type: "LineString", coordinates: path } }); };
  const point = (p: Coordinates, color: string) => features.push({ type: "Feature", properties: { color }, geometry: { type: "Point", coordinates: p } });
  if (props.comparison) {
    const diff = routeDiff(props.published, props.draft);
    diff.removed.forEach((path) => line(path, "removed", "#dc2626"));
    diff.added.forEach((path) => line(path, "added", "#059669"));
  }
  if (props.testPoints?.origin) point(props.testPoints.origin, "#2563eb");
  if (props.testPoints?.destination) point(props.testPoints.destination, "#f97316");
  if (props.overlay) {
    const paths = props.overlay.paths;
    paths.forEach((path, i) => {
      line(path, "test", props.overlay!.color);
      if (!path.length) return;
      point(path[0], "#059669"); point(path.at(-1)!, "#dc2626");
      const previous = i ? paths[i - 1].at(-1) : props.testPoints?.origin;
      if (previous) line([previous, path[0]], "walk", "#334155");
    });
    const last = paths.at(-1)?.at(-1);
    if (last && props.testPoints?.destination) line([last, props.testPoints.destination], "walk", "#334155");
  }
  return { type: "FeatureCollection", features };
}

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
  const markerRef = useRef<Marker | null>(null);
  const latest = useRef(props);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const { selected, draft: draftPath } = props;
  useEffect(() => {
    if (props.focus && status === "ready") mapRef.current?.easeTo({ center: props.focus, zoom: 16, duration: 400 });
  }, [props.focus, status]);
  useEffect(() => {
    if (props.overlay && status === "ready") {
      const points = props.overlay.paths.flat();
      if (points.length > 1) mapRef.current?.fitBounds(getBoundsFromCoordinates(points), { padding: 45, maxZoom: 16, duration: 400 });
    }
  }, [props.overlay, status]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const point = selected === null ? null : draftPath[selected];
    if (!map || !marker || status !== "ready") return;
    if (!point) { marker.remove(); return; }
    marker.getElement().textContent = `Punto ${selected! + 1}`;
    marker.setLngLat(point).addTo(map);
    const screen = map.project(point);
    const container = map.getContainer();
    if (screen.x < 45 || screen.y < 65 || screen.x > container.clientWidth - 45 || screen.y > container.clientHeight - 45) {
      map.easeTo({ center: point, zoom: Math.max(14, map.getZoom()), duration: 350 });
    }
  }, [selected, draftPath, status]);

  useEffect(() => {
    latest.current = props;
    const map = mapRef.current;
    const draft = map?.getSource<GeoJSONSource>("draft");
    draft?.setData(geometry(props.draft, props));
    map?.getSource<GeoJSONSource>("review")?.setData(reviewGeometry(props));
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
    let resizeObserver: ResizeObserver | null = null;
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
        resizeObserver = new ResizeObserver(() => {
          if (disposed) return;
          map.resize();
          const path = latest.current.draft;
          if (map.isStyleLoaded() && path.length > 1) {
            map.fitBounds(getBoundsFromCoordinates(path), { padding: 40, maxZoom: 16, duration: 0 });
          }
        });
        resizeObserver.observe(containerRef.current);
        const label = document.createElement("div");
        label.className = "admin-point-label";
        label.style.pointerEvents = "none";
        markerRef.current = new mapbox.Marker({ element: label, anchor: "bottom", offset: [0, -14] });
        map.addControl(new mapbox.NavigationControl({ showCompass: false }));
        map.on("load", () => {
          const { published, draft, relatedPaths, showPublished, showRelated } = latest.current;
          map.addSource("published", { type: "geojson", data: geometry(published) });
          map.addSource("related-directions", { type: "geojson", data: relatedGeometry(relatedPaths) });
          map.addSource("draft", { type: "geojson", data: geometry(draft, latest.current) });
          map.addSource("review", { type: "geojson", data: reviewGeometry(latest.current) });
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
          map.addLayer({ id: "review-lines", type: "line", source: "review", filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "kind"], "walk"]],
            paint: { "line-color": ["get", "color"], "line-width": 5 }, layout: { "line-join": "round", "line-cap": "round" } });
          map.addLayer({ id: "review-walk", type: "line", source: "review", filter: ["==", ["get", "kind"], "walk"],
            paint: { "line-color": "#334155", "line-width": 3, "line-dasharray": [1, 2] } });
          map.addLayer({ id: "review-points", type: "circle", source: "review", filter: ["==", ["geometry-type"], "Point"],
            paint: { "circle-color": ["get", "color"], "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
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
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="admin-map-canvas relative h-[340px] bg-[var(--brand-header)] sm:h-[460px]">
      <div ref={containerRef} aria-label="Mapa del recorrido" className="absolute inset-0" />
      {status === "ready" && <div className="absolute bottom-3 right-3 flex flex-wrap gap-2">
        {props.segment?.start != null && props.segment.end != null && <button type="button" className="admin-button min-h-11 px-3 text-xs font-bold" onClick={() => {
          const segment = latest.current.segment;
          if (segment?.start == null || segment.end == null) return;
          const path = latest.current.draft;
          mapRef.current?.fitBounds(getBoundsFromCoordinates([path[segment.start], ...segment.points, path[segment.end]]), { padding: 48, maxZoom: 17, duration: 400 });
        }}>Ver tramo A–B</button>}
        <button type="button" className="admin-button min-h-11 px-3 text-xs font-bold" onClick={() => {
          const path = latest.current.draft;
          if (path.length) mapRef.current?.fitBounds(getBoundsFromCoordinates(path), { padding: 40, maxZoom: 16, duration: 400 });
        }}>Ver recorrido completo</button>
      </div>}
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

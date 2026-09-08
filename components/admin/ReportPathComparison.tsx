"use client";

import { LoaderCircle, MapPinned, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";

type Direction = {
  id: number;
  path: Coordinates[];
};

type Props = {
  routeKey: string;
  proposedPath: unknown;
};

const CURRENT_SOURCE = "report-current-routes";
const PROPOSAL_SOURCE = "report-proposed-route";

function isCoordinate(value: unknown): value is Coordinates {
  return Array.isArray(value)
    && value.length === 2
    && value.every((number) => typeof number === "number" && Number.isFinite(number));
}

function parseDirections(value: unknown): Direction[] {
  if (typeof value !== "object" || value === null || !("directions" in value)) return [];
  const raw = (value as { directions?: unknown }).directions;
  if (!Array.isArray(raw)) return [];
  return raw.filter((direction): direction is Direction => {
    if (typeof direction !== "object" || direction === null) return false;
    const candidate = direction as Partial<Direction>;
    return Number.isSafeInteger(candidate.id)
      && Array.isArray(candidate.path)
      && candidate.path.length >= 2
      && candidate.path.every(isCoordinate);
  });
}

function parsePoints(value: unknown): Coordinates[] {
  return Array.isArray(value) ? value.filter(isCoordinate) : [];
}

function currentRouteData(directions: Direction[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: directions.map((direction) => ({
      type: "Feature",
      properties: { id: direction.id },
      geometry: { type: "LineString", coordinates: direction.path },
    })),
  };
}

function proposedRouteData(points: Coordinates[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: points.length >= 2
      ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points } }]
      : [],
  };
}

export default function ReportPathComparison({ routeKey, proposedPath }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const points = useMemo(() => parsePoints(proposedPath), [proposedPath]);

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current || points.length < 2) return;
    const controller = new AbortController();
    let disposed = false;

    async function initialize() {
      setState("loading");
      setError("");
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) throw new Error("Mapbox no está configurado.");
        const [mapboxModule, response] = await Promise.all([
          import("mapbox-gl"),
          fetch(`/api/v1/routes/${encodeURIComponent(routeKey)}/geometry`, { signal: controller.signal }),
        ]);
        if (!response.ok) throw new Error("No se pudo cargar el recorrido publicado.");
        const directions = parseDirections(await response.json());
        if (directions.length === 0) throw new Error("La ruta publicada no tiene una geometría disponible.");
        if (disposed || !containerRef.current) return;

        const mapboxgl = mapboxModule.default;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle(true),
          center: URUAPAN_CENTER,
          zoom: 12,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          if (disposed) return;
          map.addSource(CURRENT_SOURCE, { type: "geojson", data: currentRouteData(directions) });
          map.addLayer({
            id: `${CURRENT_SOURCE}-casing`,
            type: "line",
            source: CURRENT_SOURCE,
            paint: { "line-color": "#071006", "line-width": 8, "line-opacity": 0.75 },
          });
          map.addLayer({
            id: CURRENT_SOURCE,
            type: "line",
            source: CURRENT_SOURCE,
            paint: { "line-color": "#48cce0", "line-width": 4, "line-opacity": 0.82 },
          });
          map.addSource(PROPOSAL_SOURCE, { type: "geojson", data: proposedRouteData(points) });
          map.addLayer({
            id: `${PROPOSAL_SOURCE}-casing`,
            type: "line",
            source: PROPOSAL_SOURCE,
            paint: { "line-color": "#071006", "line-width": 9, "line-opacity": 0.8 },
          });
          map.addLayer({
            id: PROPOSAL_SOURCE,
            type: "line",
            source: PROPOSAL_SOURCE,
            paint: { "line-color": "#f4c84a", "line-width": 5, "line-dasharray": [1.2, 1.2] },
          });

          const bounds = new mapboxgl.LngLatBounds();
          directions.forEach((direction) => direction.path.forEach((point) => bounds.extend(point)));
          points.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
          setState("ready");
        });
      } catch (caught) {
        if (controller.signal.aborted || disposed) return;
        setState("error");
        setError(caught instanceof Error ? caught.message : "No se pudo abrir la comparación.");
      }
    }

    void initialize();
    return () => {
      disposed = true;
      controller.abort();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [open, points, routeKey]);

  if (points.length < 2) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        className="mt-4 inline-flex h-10 items-center gap-2 border border-[#48cce0]/30 px-3 text-xs font-black text-[#74dceb] transition hover:bg-[#48cce0]/10"
      >
        <MapPinned className="h-4 w-4" aria-hidden="true" />
        Comparar recorridos
        <span className="text-[#60784f]">{points.length} puntos</span>
      </button>
    );
  }

  return (
    <section className="mt-4 border border-[#48cce0]/25 bg-[#090d08]" aria-label="Comparación de recorridos">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase text-[#74dceb]">Comparación del reporte</p>
          <p className="mt-1 text-[11px] text-[#78965f]">Azul: publicado. Amarillo: propuesta de la comunidad.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar comparación" className="grid h-9 w-9 place-items-center text-[#78965f] hover:text-[#e8f2d8]">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="relative h-80 bg-[#10170e]">
        <div ref={containerRef} className="absolute inset-0" />
        {state === "loading" && <div className="absolute inset-0 grid place-items-center bg-[#0c110a]/85"><LoaderCircle className="h-6 w-6 animate-spin text-[#48cce0]" aria-label="Cargando comparación" /></div>}
        {state === "ready" && (
          <div className="pointer-events-none absolute left-3 top-3 flex gap-2 text-[10px] font-black uppercase">
            <span className="bg-[#0c110a]/95 px-2.5 py-2 text-[#74dceb]">Publicado</span>
            <span className="bg-[#0c110a]/95 px-2.5 py-2 text-[#f4c84a]">Propuesta</span>
          </div>
        )}
        {state === "error" && <p className="absolute inset-x-4 top-4 border-l-2 border-[#f4c84a] bg-[#0c110a]/95 px-4 py-3 text-xs text-[#f4df98]" role="alert">{error}</p>}
      </div>
    </section>
  );
}

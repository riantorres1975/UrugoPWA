"use client";

import { Check, LoaderCircle, MapPinned, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";

type Direction = {
  id: number;
  label: string;
  color: string;
  path: Coordinates[];
};

type GeometryResponse = {
  directions: Direction[];
};

type Props = {
  routeKey: string;
  points: Coordinates[];
  onChange: (points: Coordinates[]) => void;
};

const CURRENT_SOURCE = "proposal-current-route";
const PROPOSAL_LINE_SOURCE = "proposal-line";
const PROPOSAL_POINTS_SOURCE = "proposal-points";
const MAX_PROPOSAL_POINTS = 120;

function isCoordinate(value: unknown): value is Coordinates {
  return Array.isArray(value)
    && value.length === 2
    && value.every((number) => typeof number === "number" && Number.isFinite(number));
}

function parseGeometryResponse(value: unknown): GeometryResponse | null {
  if (typeof value !== "object" || value === null || !("directions" in value) || !Array.isArray(value.directions)) return null;
  const directions = value.directions.filter((direction): direction is Direction => {
    if (typeof direction !== "object" || direction === null) return false;
    const candidate = direction as Partial<Direction>;
    return Number.isSafeInteger(candidate.id)
      && typeof candidate.label === "string"
      && typeof candidate.color === "string"
      && Array.isArray(candidate.path)
      && candidate.path.length >= 2
      && candidate.path.every(isCoordinate);
  });
  return directions.length > 0 ? { directions } : null;
}

function lineData(points: Coordinates[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: points.length >= 2
      ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points } }]
      : [],
  };
}

function pointData(points: Coordinates[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point, index) => ({
      type: "Feature",
      properties: { index: index + 1 },
      geometry: { type: "Point", coordinates: point },
    })),
  };
}

export default function RouteProposalMap({ routeKey, points, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const pointsRef = useRef(points);
  const onChangeRef = useRef(onChange);

  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!open || !containerRef.current || mapRef.current) return;
    const controller = new AbortController();
    let disposed = false;

    async function initialize() {
      setState("loading");
      setError("");
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) throw new Error("El editor de mapa no está disponible en este momento.");

        const [mapboxModule, response] = await Promise.all([
          import("mapbox-gl"),
          fetch(`/api/v1/routes/${encodeURIComponent(routeKey)}/geometry`, { signal: controller.signal }),
        ]);
        if (!response.ok) throw new Error("No pudimos cargar el recorrido publicado.");
        const parsed = parseGeometryResponse(await response.json());
        if (!parsed) throw new Error("El recorrido publicado no tiene datos válidos.");
        if (disposed || !containerRef.current) return;

        const firstDirection = parsed.directions[0];
        setDirections(parsed.directions);
        setSelectedId(firstDirection.id);

        const mapboxgl = mapboxModule.default;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: getMapStyle(true),
          center: URUAPAN_CENTER,
          zoom: 12.5,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (disposed) return;
          map.addSource(CURRENT_SOURCE, {
            type: "geojson",
            data: lineData(firstDirection.path),
          });
          map.addLayer({
            id: `${CURRENT_SOURCE}-casing`,
            type: "line",
            source: CURRENT_SOURCE,
            paint: { "line-color": "#071006", "line-width": 8, "line-opacity": 0.72 },
          });
          map.addLayer({
            id: CURRENT_SOURCE,
            type: "line",
            source: CURRENT_SOURCE,
            paint: { "line-color": "#48cce0", "line-width": 4, "line-opacity": 0.82 },
          });
          map.addSource(PROPOSAL_LINE_SOURCE, { type: "geojson", data: lineData(pointsRef.current) });
          map.addLayer({
            id: PROPOSAL_LINE_SOURCE,
            type: "line",
            source: PROPOSAL_LINE_SOURCE,
            paint: { "line-color": "#f4c84a", "line-width": 5, "line-dasharray": [1.2, 1.2] },
          });
          map.addSource(PROPOSAL_POINTS_SOURCE, { type: "geojson", data: pointData(pointsRef.current) });
          map.addLayer({
            id: PROPOSAL_POINTS_SOURCE,
            type: "circle",
            source: PROPOSAL_POINTS_SOURCE,
            paint: {
              "circle-radius": 6,
              "circle-color": "#f4c84a",
              "circle-stroke-color": "#071006",
              "circle-stroke-width": 3,
            },
          });

          const bounds = new mapboxgl.LngLatBounds();
          firstDirection.path.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
          setState("ready");
        });

        map.on("click", (event) => {
          if (pointsRef.current.length >= MAX_PROPOSAL_POINTS) {
            setError(`Máximo ${MAX_PROPOSAL_POINTS} puntos por propuesta.`);
            return;
          }
          const nextPoint: Coordinates = [
            Number(event.lngLat.lng.toFixed(6)),
            Number(event.lngLat.lat.toFixed(6)),
          ];
          onChangeRef.current([...pointsRef.current, nextPoint]);
        });
      } catch (caught) {
        if (controller.signal.aborted || disposed) return;
        setState("error");
        setError(caught instanceof Error ? caught.message : "No pudimos abrir el editor de mapa.");
      }
    }

    void initialize();
    return () => {
      disposed = true;
      controller.abort();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [open, routeKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    (map.getSource(PROPOSAL_LINE_SOURCE) as import("mapbox-gl").GeoJSONSource | undefined)?.setData(lineData(points));
    (map.getSource(PROPOSAL_POINTS_SOURCE) as import("mapbox-gl").GeoJSONSource | undefined)?.setData(pointData(points));
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    const direction = directions.find((candidate) => candidate.id === selectedId);
    if (!map?.isStyleLoaded() || !direction) return;
    (map.getSource(CURRENT_SOURCE) as import("mapbox-gl").GeoJSONSource | undefined)?.setData(lineData(direction.path));
    map.setPaintProperty(CURRENT_SOURCE, "line-color", "#48cce0");
    const longitudes = direction.path.map(([longitude]) => longitude);
    const latitudes = direction.path.map(([, latitude]) => latitude);
    map.fitBounds([
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ], { padding: 48, maxZoom: 14, duration: 450 });
  }, [directions, selectedId]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded="false"
        className="flex min-h-14 w-full items-center justify-between gap-3 border border-[#48cce0]/35 bg-[#071312] px-4 text-left text-sm font-black text-[#dff9fb] transition hover:border-[#74dceb] hover:bg-[#0a1b19]"
      >
        <span className="inline-flex items-center gap-3"><MapPinned className="h-5 w-5 text-[#48cce0]" aria-hidden="true" /> Abrir mapa y marcar calles</span>
        {points.length >= 2 && <span className="shrink-0 bg-[#48cce0] px-2 py-1 text-xs text-[#071006]">Listo</span>}
      </button>
    );
  }

  return (
    <section className="border border-[#48cce0]/30 bg-[#090d08]" aria-label="Propuesta de recorrido">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs font-black uppercase text-[#74dceb]">Recorrido propuesto</p>
          <p className="mt-1 text-[11px] text-[#89a873]">Toca las calles en orden. Azul: ruta publicada. Amarillo: tu corrección.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-[#78965f] hover:text-[#e8f2d8]">Cerrar mapa</button>
      </div>

      {directions.length > 1 && (
        <label className="block border-b border-white/10 px-4 py-3 text-xs font-bold text-[#89a873]">
          Recorrido de referencia
          <select value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))} className="ml-3 h-9 border border-white/15 bg-[#111a0d] px-3 text-xs text-[#e8f2d8] outline-none focus:border-[#48cce0]/60">
            {directions.map((direction) => <option key={direction.id} value={direction.id}>{direction.label}</option>)}
          </select>
        </label>
      )}

      <div className="relative h-[420px] w-full bg-[#10170e] sm:h-[480px]">
        <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />
        {state === "loading" && <div className="absolute inset-0 grid place-items-center bg-[#0c110a]/85"><LoaderCircle className="h-6 w-6 animate-spin text-[#48cce0]" aria-label="Cargando mapa" /></div>}
        {state === "ready" && points.length === 0 && <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0c110a]/95 px-3 py-2 text-xs font-bold text-[#e8f2d8] shadow-lg">Marca el primer punto</p>}
        {state === "ready" && (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[10px] font-black uppercase">
            <span className="bg-[#0c110a]/95 px-2.5 py-2 text-[#74dceb]">Línea actual</span>
            <span className="bg-[#0c110a]/95 px-2.5 py-2 text-[#f4c84a]">Tu propuesta</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <p className="text-xs text-[#78965f]">{points.length < 2 ? `${points.length} de 2 puntos mínimos` : `${points.length} puntos listos para enviar`}</p>
        <div className="flex gap-2">
          <button type="button" disabled={points.length === 0} onClick={() => onChange(points.slice(0, -1))} aria-label="Deshacer último punto" title="Deshacer último punto" className="grid h-9 w-9 place-items-center border border-white/15 text-[#a8c888] hover:text-[#e8f2d8] disabled:opacity-30"><Undo2 className="h-4 w-4" /></button>
          <button type="button" disabled={points.length === 0} onClick={() => onChange([])} aria-label="Borrar propuesta" title="Borrar propuesta" className="grid h-9 w-9 place-items-center border border-[#dd6b5f]/25 text-[#e98b80] hover:bg-[#dd6b5f]/10 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setOpen(false)} title="Terminar propuesta" className="inline-flex h-9 items-center gap-2 bg-[#48cce0] px-3 text-xs font-black text-[#071006]"><Check className="h-4 w-4" /> Terminar</button>
        </div>
      </div>
      {error && <p className="border-t border-[#f4c84a]/20 px-4 py-3 text-xs text-[#f4df98]" role="alert">{error}</p>}
    </section>
  );
}

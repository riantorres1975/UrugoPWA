"use client";

import { Check, ChevronLeft, Crosshair, Eye, EyeOff, LoaderCircle, MapPinned, Plus, Redo2, Search, Trash2, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getMapStyle, URUAPAN_CENTER } from "@/lib/map";
import type { Coordinates } from "@/lib/types";
import "./route-proposal.css";

type Direction = { id: number; label: string; path: Coordinates[] };
type Props = {
  routeKey: string;
  points: Coordinates[];
  onChange: (points: Coordinates[]) => void;
  direction?: string;
  onDirectionChange?: (label: string) => void;
};
const CURRENT = "proposal-current-route";
const LINE = "proposal-line";
const MAX_POINTS = 120;

function lineData(points: Coordinates[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return { type: "FeatureCollection", features: points.length < 2 ? [] : [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points } }] };
}
function parseDirections(value: unknown): Direction[] {
  if (!value || typeof value !== "object" || !("directions" in value) || !Array.isArray(value.directions)) return [];
  return value.directions.filter((item): item is Direction => item && Number.isSafeInteger(item.id) && typeof item.label === "string" && Array.isArray(item.path) && item.path.length >= 2 && item.path.every((p: unknown) => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === "number" && Number.isFinite(n))));
}

export default function RouteProposalMap(props: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="proposal-launch" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <MapPinned size={22} aria-hidden="true" />
      <span><strong>{props.points.length >= 2 ? "Revisar mi tramo" : "Marcar calles en el mapa"}</strong><small>{props.points.length >= 2 ? `${props.points.length} puntos · ${props.direction || "Recorrido propuesto"}` : "Pantalla completa · opcional"}</small></span>
      {props.points.length >= 2 ? <Check size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
    </button>
    {open && createPortal(<ProposalEditor {...props} onClose={() => setOpen(false)} />, document.body)}
  </>;
}

function ProposalEditor({ routeKey, points, onChange, direction, onDirectionChange, onClose }: Props & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerConstructor = useRef<typeof import("mapbox-gl").Marker | null>(null);
  const currentRef = useRef(points);
  const directionChangeRef = useRef(onDirectionChange);
  const initialDirection = useRef(direction);
  const history = useRef<Coordinates[][]>([]);
  const future = useRef<Coordinates[][]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showReference, setShowReference] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<import("@/lib/geocode").PlaceResult[]>([]);
  const searchGeneration = useRef(0);
  const searchAbort = useRef<AbortController | null>(null);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const activeDirection = directions.find(item => item.id === selectedId);

  useEffect(() => { currentRef.current = points; directionChangeRef.current = onDirectionChange; }, [points, onDirectionChange]);
  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--proposal-view-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--proposal-view-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize(); viewport?.addEventListener("resize", resize); viewport?.addEventListener("scroll", resize);
    return () => {
      // Invalidate asynchronous searches when this editor is closed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      searchGeneration.current++;
      searchAbort.current?.abort();
      viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let backgroundFailed = false;
    const timer = setTimeout(() => {
      if (!disposed) { setFailed(true); setError("El mapa está tardando en cargar. Puedes reabrirlo o enviar el reporte solo con una descripción."); }
    }, 20000);
    async function initialize() {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) throw new Error("El mapa no está disponible. Puedes enviar el reporte describiendo las calles.");
        const [module, response] = await Promise.all([import("mapbox-gl"), fetch(`/api/v1/routes/${encodeURIComponent(routeKey)}/geometry`, { signal: controller.signal })]);
        if (!response.ok) throw new Error("No pudimos cargar esta ruta. Cierra el mapa e intenta otra vez.");
        const paths = parseDirections(await response.json());
        if (!paths.length) throw new Error("Esta ruta no tiene un recorrido disponible para comparar.");
        if (disposed || !containerRef.current) return;
        const initial = paths.find(item => item.label === initialDirection.current) ?? paths[0];
        setDirections(paths); setSelectedId(initial.id);
        directionChangeRef.current?.(initial.label);
        const mapboxgl = module.default;
        markerConstructor.current = mapboxgl.Marker;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({ container: containerRef.current, style: getMapStyle(false), center: URUAPAN_CENTER, zoom: 13, attributionControl: true });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disableRotation();
        map.on("error", event => {
          const status = (event.error as Error & { status?: number })?.status;
          if (disposed || (status !== 401 && status !== 403)) return;
          backgroundFailed = true; clearTimeout(timer); setReady(false); setFailed(true);
          setError("No pudimos cargar las calles del mapa. Puedes volver y describir por dónde pasa el camión; tu tramo se conserva.");
        });
        map.on("load", () => {
          if (disposed || backgroundFailed) return;
          clearTimeout(timer);
          map.addSource(CURRENT, { type: "geojson", data: lineData(initial.path) });
          map.addLayer({ id: CURRENT, type: "line", source: CURRENT, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#167aaf", "line-width": 5, "line-opacity": .65 } });
          map.addSource(LINE, { type: "geojson", data: lineData(currentRef.current) });
          map.addLayer({ id: `${LINE}-casing`, type: "line", source: LINE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#fff", "line-width": 9 } });
          map.addLayer({ id: LINE, type: "line", source: LINE, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#a45f0c", "line-width": 5 } });
          const bounds = new mapboxgl.LngLatBounds();
          (currentRef.current.length >= 2 ? currentRef.current : initial.path).forEach(p => bounds.extend(p));
          map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
          setFailed(false); setError(""); setReady(true);
        });
        // Navigating the map never changes the proposed path; adding requires the explicit button.
      } catch (cause) {
        clearTimeout(timer);
        if (!disposed && !controller.signal.aborted) { setFailed(true); setError(cause instanceof Error ? cause.message : "No pudimos abrir el mapa."); }
      }
    }
    void initialize();
    return () => { disposed = true; clearTimeout(timer); controller.abort(); mapRef.current?.remove(); mapRef.current = null; };
  }, [routeKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource(LINE) as import("mapbox-gl").GeoJSONSource)?.setData(lineData(points));
    const Marker = markerConstructor.current;
    if (!Marker) return;
    const markers = points.map((point, index) => {
      const element = document.createElement("div");
      element.className = `proposal-point-marker${selectedPoint === index ? " is-selected" : ""}`;
      element.textContent = String(index + 1);
      element.setAttribute("aria-hidden", "true");
      return new Marker({ element }).setLngLat(point).addTo(map);
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [points, selectedPoint, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !activeDirection) return;
    (map.getSource(CURRENT) as import("mapbox-gl").GeoJSONSource)?.setData(lineData(activeDirection.path));
    map.setLayoutProperty(CURRENT, "visibility", showReference ? "visible" : "none");
  }, [activeDirection, ready, showReference]);

  function update(next: Coordinates[]) {
    history.current = [...history.current.slice(-49), currentRef.current]; future.current = []; currentRef.current = next; onChange(next);
    setSelectedPoint(null); setInsertAfter(null); setError(""); setConfirmClear(false); setHistoryCounts({ undo: history.current.length, redo: 0 });
  }
  function addPoint() {
    const map = mapRef.current;
    if (!ready || !map) return;
    const center = map.getCenter();
    const point: Coordinates = [Number(center.lng.toFixed(6)), Number(center.lat.toFixed(6))];
    if (point[0] < -103 || point[0] > -101 || point[1] < 18.5 || point[1] > 20.5) { setError("Acerca el mapa a Uruapan para marcar el recorrido."); return; }
    const current = currentRef.current;
    const neighbor = insertAfter !== null ? current[insertAfter] : selectedPoint === null ? current.at(-1) : null;
    if (neighbor && Math.abs(point[0] - neighbor[0]) + Math.abs(point[1] - neighbor[1]) < .00002) { setError("Mueve el mapa hasta la siguiente esquina antes de agregar otro punto."); return; }
    if (selectedPoint === null && current.length >= MAX_POINTS) { setError("Llegaste a 120 puntos. Puedes mover o quitar un punto para ajustar el tramo."); return; }
    update(insertAfter !== null ? [...current.slice(0, insertAfter + 1), point, ...current.slice(insertAfter + 1)] : selectedPoint === null ? [...current, point] : current.map((p, i) => i === selectedPoint ? point : p));
    setNotice(insertAfter !== null ? `Punto ${insertAfter + 2} insertado. Se conserva el orden de los siguientes.` : selectedPoint === null ? `Punto ${current.length + 1} agregado. Mueve el mapa a la siguiente esquina.` : `Punto ${selectedPoint + 1} actualizado.`);
  }
  function undo(redo = false) {
    const from = redo ? future : history; const to = redo ? history : future; const next = from.current.pop();
    if (!next) return;
    to.current.push(currentRef.current); currentRef.current = next; onChange(next);
    setSelectedPoint(null); setInsertAfter(null); setConfirmClear(false); setError(""); setNotice(redo ? "Cambio recuperado." : "Último cambio deshecho."); setHistoryCounts({ undo: history.current.length, redo: future.current.length });
  }
  function selectPoint(index: number) {
    setSelectedPoint(index); setInsertAfter(null); setNotice(`Punto ${index + 1} seleccionado. Mueve la mira para cambiarlo.`);
    mapRef.current?.flyTo({ center: points[index], zoom: Math.max(16, mapRef.current.getZoom()), duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300 });
  }
  async function search() {
    if (query.trim().length < 3) { setNotice("Escribe al menos 3 letras para buscar una calle o lugar."); return; }
    searchAbort.current?.abort(); const controller = new AbortController(); searchAbort.current = controller;
    const generation = ++searchGeneration.current;
    setSearching(true); setResults([]);
    try {
      const { searchPlaces } = await import("@/lib/geocode");
      const found = await searchPlaces(query, { limit: 4, signal: controller.signal });
      if (generation !== searchGeneration.current) return;
      setResults(found); if (!found.length) setNotice("Sin resultados. Puedes acercar el mapa y buscar la calle manualmente.");
    } catch { if (generation === searchGeneration.current) setNotice("No pudimos buscar. Puedes mover el mapa manualmente."); }
    finally { if (generation === searchGeneration.current) setSearching(false); }
  }

  return <dialog ref={dialogRef} className="proposal-editor" aria-labelledby="proposal-title" aria-describedby={ready ? "proposal-instructions" : undefined} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="proposal-header">
      <button type="button" onClick={onClose} className="proposal-icon" aria-label="Volver al reporte"><ChevronLeft size={22} /></button>
      <div><p>Corrección del recorrido</p><h2 id="proposal-title">¿Por dónde pasa el camión?</h2></div><span className="proposal-count">{points.length}/120</span>
    </header>
    <div className="proposal-reference">
      <div className="proposal-directions" aria-label="Sentido de referencia">{directions.map(item => <button type="button" key={item.id} aria-pressed={item.id === selectedId} onClick={() => { setSelectedId(item.id); directionChangeRef.current?.(item.label); setNotice(`Referencia: ${item.label}. Tu tramo se conserva.`); }}>{item.label}</button>)}</div>
      <button type="button" className="proposal-icon" aria-label={showReference ? "Ocultar ruta publicada" : "Mostrar ruta publicada"} aria-pressed={showReference} onClick={() => setShowReference(v => !v)}>{showReference ? <Eye size={19} /> : <EyeOff size={19} />}</button>
    </div>
    <div className="proposal-search">
      <input aria-label="Buscar calle o lugar en el mapa" placeholder="Buscar calle, colonia o lugar" value={query} maxLength={120} onChange={event => { searchGeneration.current++; searchAbort.current?.abort(); setSearching(false); setResults([]); setQuery(event.target.value); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); void search(); } }} />
      <button type="button" className="proposal-icon" disabled={searching || !ready} aria-label="Buscar en el mapa" onClick={() => void search()}>{searching ? <LoaderCircle className="animate-spin" size={20} /> : <Search size={20} />}</button>
      {results.length > 0 && <div className="proposal-results">{results.map((result, index) => <button key={`${result.label}-${index}`} type="button" onClick={() => { searchGeneration.current++; searchAbort.current?.abort(); setResults([]); setQuery(result.label); if (document.activeElement instanceof HTMLInputElement) document.activeElement.blur(); mapRef.current?.flyTo({ center: result.center, zoom: 16, duration: 0 }); setNotice(`Mapa centrado en ${result.label}. No se ha agregado ningún punto.`); }}>{result.label}</button>)}</div>}
    </div>
    <div className="proposal-map">
      <div ref={containerRef} className="proposal-canvas" />
      {!ready && !failed && <div className="proposal-loading" role="status"><LoaderCircle size={26} className="animate-spin" /> Cargando mapa…</div>}
      {failed && !ready && <div className="proposal-loading"><MapPinned size={30} /><p>{error}</p><button type="button" onClick={onClose}>Volver y describir las calles</button></div>}
      {ready && <><div className="proposal-mira" aria-hidden="true"><Crosshair size={34} strokeWidth={1.8} /></div><p className="proposal-map-hint" id="proposal-instructions">{selectedPoint !== null ? `Coloca la mira donde va el punto ${selectedPoint + 1}` : points.length === 0 ? "Mueve el mapa al inicio del tramo que cambió" : "Mueve la mira a la siguiente esquina"}</p><div className="proposal-legend"><span>Azul: publicado</span><span>Ámbar: tu tramo</span></div></>}
    </div>
    <div className="proposal-tools">
      {points.length > 0 && <div className="proposal-point-list" aria-label="Puntos del tramo">{points.map((_, i) => <button key={i} type="button" aria-label={`Editar punto ${i + 1}`} aria-pressed={selectedPoint === i} onClick={() => selectPoint(i)}>{i + 1}</button>)}</div>}
      {selectedPoint !== null && <div className="proposal-selection"><span>Punto {selectedPoint + 1}</span><button type="button" onClick={() => { setInsertAfter(selectedPoint); setSelectedPoint(null); setNotice(`Mueve la mira a la esquina que falta después del punto ${selectedPoint + 1}.`); }}><Plus size={16} />Insertar después</button><button type="button" onClick={() => { update(points.filter((_, i) => i !== selectedPoint)); setNotice("Punto eliminado."); }}><Trash2 size={16} />Quitar</button><button type="button" onClick={() => setSelectedPoint(null)} aria-label="Cancelar edición de punto"><X size={16} /></button></div>}
      {insertAfter !== null && <div className="proposal-selection"><span>Insertando después del punto {insertAfter + 1}</span><button type="button" onClick={() => setInsertAfter(null)}>Cancelar</button></div>}
      {confirmClear ? <div className="proposal-clear"><span>¿Borrar los {points.length} puntos?</span><button type="button" onClick={() => { update([]); setNotice("Tramo borrado. Puedes empezar otra vez."); }}>Sí, borrar</button><button type="button" onClick={() => setConfirmClear(false)}>Conservar</button></div> : <div className="proposal-actions">
        <button type="button" className="proposal-icon" aria-label="Deshacer último cambio" disabled={!historyCounts.undo} onClick={() => undo()}><Undo2 size={20} /></button>
        <button type="button" className="proposal-icon" aria-label="Rehacer último cambio" disabled={!historyCounts.redo} onClick={() => undo(true)}><Redo2 size={20} /></button>
        <button type="button" className="proposal-add" disabled={!ready} onClick={addPoint}><Plus size={19} />{insertAfter !== null ? "Insertar punto" : selectedPoint === null ? "Agregar punto" : `Mover punto ${selectedPoint + 1}`}</button>
        <button type="button" className="proposal-icon" aria-label="Borrar todo el tramo" disabled={!points.length} onClick={() => setConfirmClear(true)}><Trash2 size={19} /></button>
      </div>}
      <p className="proposal-status" role="status">{error && ready ? error : notice || "Marca solo el tramo que conoces, en el orden del viaje. No hace falta toda la ruta."}</p>
      <button type="button" className="proposal-done" disabled={points.length < 2 || !ready} onClick={onClose}><Check size={19} />{points.length < 2 ? "Agrega al menos 2 puntos" : `Usar este tramo · ${points.length} puntos`}</button>
      <p className="proposal-footnote">Se adjunta al reporte. Revisaremos el cambio antes de publicarlo.</p>
    </div>
  </dialog>;
}

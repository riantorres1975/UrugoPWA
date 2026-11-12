"use client";

import { useEffect, useRef, useState } from "react";
import { searchLocalPlaces, searchPlaces, type PlaceResult } from "@/lib/geocode";
import { simulateDraftJourney, proposeRoadAlignment } from "@/app/admin/workspace-actions";
import type { Coordinates } from "@/lib/types";
import type { RouteSegmentDraft } from "@/lib/admin-route";
import RoutePreviewSVG from "@/components/RoutePreviewSVG";

const button = "admin-button min-h-11 px-3 text-xs font-bold";
export type JourneyTestPoints = { origin: Coordinates | null; destination: Coordinates | null };
export type EditorOverlay = { paths: Coordinates[][]; color: string; label: string };

export function EditorPlaceSearch({ onLocate }: { onLocate: (point: Coordinates) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [notice, setNotice] = useState("");
  const request = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  async function search() {
    const id = ++request.current;
    abort.current?.abort(); abort.current = new AbortController();
    setResults(searchLocalPlaces(query, 5)); setNotice("Buscando…");
    try {
      const found = await searchPlaces(query, { limit: 5, signal: abort.current.signal });
      if (request.current !== id) return;
      setResults(found); setNotice(found.length ? "Selecciona un lugar para centrar el mapa." : "Sin resultados. Prueba otra calle o referencia.");
    } catch { if (request.current === id) setNotice("No pudimos consultar direcciones. Se muestran las referencias locales disponibles."); }
  }
  return <div className="space-y-2 border-t border-[var(--admin-line)] p-4">
    <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs font-bold">Buscar calle, colonia o referencia
      <input className="admin-field mt-1 w-full" value={query} maxLength={120} placeholder="Ej. Calle Veracruzana" onChange={(event) => {
        request.current++; abort.current?.abort(); setQuery(event.target.value); setResults([]); setNotice("");
      }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (query.trim().length >= 3) void search(); } }} />
    </label><button type="button" className={button} disabled={query.trim().length < 3} onClick={() => void search()}>Buscar en mapa</button></div>
    {notice && <p role="status" className="text-xs text-[var(--admin-muted)]">{notice}</p>}
    {results.length > 0 && <ul className="space-y-1" aria-label="Lugares encontrados">{results.map((place, index) => <li key={`${place.label}-${index}`}>
      <button type="button" className={`${button} w-full text-left`} onClick={() => { onLocate(place.center); setResults([]); setNotice(`Mapa centrado en ${place.label}.`); }}>{place.label}</button>
    </li>)}</ul>}
  </div>;
}

type TestOption = { label: string; minutes: number; walkM: number; paths: Coordinates[][]; usesDraft: boolean };
export function DraftJourneyTest({ routeId, path, points, target, onTarget, onReset, onOverlay, disabled }: {
  routeId: number; path: string; points: JourneyTestPoints; target: "origin" | "destination" | null;
  onTarget: (target: "origin" | "destination") => void; onReset: () => void; onOverlay: (overlay: EditorOverlay | null) => void; disabled: boolean;
}) {
  const [options, setOptions] = useState<TestOption[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const [resultKey, setResultKey] = useState("");
  const key = JSON.stringify([path, points]);
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);
  const validResult = resultKey === key;
  async function test() {
    if (!points.origin || !points.destination) return;
    const id = ++generation.current; setBusy(true); setError(""); onOverlay(null);
    try {
      const result = await simulateDraftJourney(routeId, path, points.origin, points.destination);
      if (id !== generation.current || currentKey.current !== key) return;
      setResultKey(key);
      if (result.error) { setError(result.error); setOptions(null); }
      else setOptions(result.options ?? []);
    } catch { setError("No se pudo calcular la prueba. Tu borrador sigue intacto."); }
    finally { if (id === generation.current) setBusy(false); }
  }
  return <details className="border-t border-[var(--admin-line)] p-4">
    <summary className="cursor-pointer text-sm font-bold">Probar un viaje antes de publicar</summary>
    <p className="my-3 text-xs leading-5 text-[var(--admin-muted)]">Marca origen y destino en el mapa. Usamos el borrador de este sentido y el resto de la red publicada. La caminata es aproximada; no incluye comprobación de accesos por calles.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={disabled} aria-pressed={target === "origin"} onClick={() => onTarget("origin")}>{points.origin ? "Cambiar origen de prueba" : "Marcar origen de prueba"}</button>
      <button type="button" className={button} disabled={disabled} aria-pressed={target === "destination"} onClick={() => onTarget("destination")}>{points.destination ? "Cambiar destino de prueba" : "Marcar destino de prueba"}</button>
      <button type="button" className={`${button} admin-primary`} disabled={disabled || busy || !points.origin || !points.destination || !!target} onClick={() => void test()}>{busy ? "Calculando…" : "Calcular prueba"}</button>
      <button type="button" className={button} onClick={() => { generation.current++; setBusy(false); setOptions(null); setError(""); onReset(); }}>Limpiar prueba</button>
    </div>
    <p role="status" className="mt-2 text-xs text-[var(--admin-muted)]">{target ? `Toca el mapa para marcar ${target === "origin" ? "el origen" : "el destino"}.` : `${points.origin ? "Origen marcado" : "Falta origen"} · ${points.destination ? "Destino marcado" : "Falta destino"}`}</p>
    {error && <p role="alert" className="mt-2 text-xs text-amber-200">{error}</p>}
    {options && !validResult && <p className="mt-2 text-xs text-amber-200">El borrador o los puntos cambiaron. Calcula otra vez para revisar el viaje actual.</p>}
    {validResult && options?.length === 0 && <p className="mt-3 text-sm">No hay viajes viables entre esos puntos con la red actual.</p>}
    {validResult && options?.map((option, index) => <div className="mt-3 rounded-xl border border-[var(--admin-line)] p-3" key={index}>
      <p className="text-sm font-bold">{option.label}</p><p className="mt-1 text-xs text-[var(--admin-muted)]">~{option.minutes} min · ~{Math.round(option.walkM)} m a pie · {option.usesDraft ? "Incluye el borrador" : "Usa otras rutas publicadas"}</p>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">Círculos verdes: subidas · rojos: bajadas · tramos discontinuos: caminatas de conexión.</p>
      <button type="button" className={`${button} mt-2`} onClick={() => onOverlay({ paths: option.paths, color: "#7c3aed", label: option.label })}>Ver subidas, bajadas y cambio</button>
    </div>)}
  </details>;
}

export function RoadAlignmentProposal({ draft, segment, onApply }: { draft: Coordinates[]; segment: RouteSegmentDraft; onApply: (points: Coordinates[]) => void }) {
  const [proposal, setProposal] = useState<Coordinates[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signature = JSON.stringify([draft, segment]);
  const latest = useRef(signature);
  const [candidateKey, setCandidateKey] = useState("");
  useEffect(() => { latest.current = signature; }, [signature]);
  if (segment.start === null || segment.end === null) return null;
  const a = draft[segment.start], b = draft[segment.end];
  const reversed = segment.start > segment.end;
  const current = candidateKey === signature;
  return <div className="space-y-2 border-t border-violet-300/30 pt-3">
    <button type="button" className={button} disabled={busy || segment.points.length > 23} onClick={async () => {
      setBusy(true); setError(""); setProposal(null);
      const points = [a, ...segment.points, b]; if (reversed) points.reverse();
      try {
        const result = await proposeRoadAlignment(points);
        if (latest.current !== signature) return;
        setCandidateKey(signature);
        if (result.error) setError(result.error);
        else { const path = result.path!; setProposal(reversed ? [...path].reverse() : path); }
      } catch { setError("No se pudo preparar el trazado por calles."); }
      finally { setBusy(false); }
    }}>{busy ? "Buscando calles…" : "Proponer trazado por calles"}</button>
    <p className="text-xs leading-5 text-[var(--admin-muted)]">Sigue el sentido del recorrido y los puntos intermedios que marques. Es una propuesta para automóvil: comprueba que el camión pueda pasar.</p>
    {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
    {current && proposal && <><RoutePreviewSVG paths={[[a, ...proposal, b]]} color="#c4b5fd" width={240} height={140} className="h-auto max-w-full" />
      <p className="text-xs">{proposal.length} puntos propuestos · © OpenStreetMap contributors · OSRM</p>
      <button type="button" className={`${button} admin-primary`} onClick={() => { onApply(proposal); setProposal(null); }}>Usar propuesta y revisar en mapa</button>
    </>}
  </div>;
}

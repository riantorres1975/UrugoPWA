"use client";

import Fuse from "fuse.js";
import Link from "next/link";
import { memo, useDeferredValue, useMemo, useState } from "react";
import TelefericoSection from "@/components/TelefericoSection";
import { getRouteDestination, getRouteSearchTerms } from "@/lib/route-names";
import type { ResolvedRouteData, RouteDirection, ProductionRouteLandmark } from "@/lib/types";

const TELEFERICO_ROUTE_NAME = "Teleférico Uruapan";
const EMPTY_ROUTE_NAMES = new Set<string>();

type LandmarkSearchEntry = {
  label: string;
  routeNames: Set<string>;
};

type RouteListProps = {
  routes: ResolvedRouteData[];
  isLoading?: boolean;
  suggestedRouteIds: number[];
  suggestedRouteDirections?: Map<number, RouteDirection>;
  bestSuggestedRouteId: number | null;
  alternativeSuggestedRouteIds?: number[];
  nearbyRouteIds: number[];
  selectedRouteId: number | null;
  landmarksByRouteName?: Map<string, ProductionRouteLandmark[]>;
  favoriteRouteNames?: Set<string>;
  onToggleFavorite?: (routeName: string) => void;
  onSelectRoute: (routeId: number) => void;
  onClearSelection?: () => void;
  onShowTeleferico?: () => void;
  /** Hover de fila → resaltar la ruta en el mapa (solo se pasa en desktop) */
  onHoverRoute?: (routeId: number | null) => void;
};

function isTelefericoRoute(route: Pick<ResolvedRouteData, "ruta" | "nombre">) {
  return route.ruta === TELEFERICO_ROUTE_NAME || route.nombre === TELEFERICO_ROUTE_NAME;
}

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function findMatchedLandmark(query: string, index: Map<string, LandmarkSearchEntry>) {
  if (!query) return null;
  const normalizedQuery = normalizeSearchValue(query);
  for (const [key, entry] of index) {
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      return { key, label: entry.label };
    }
  }
  return null;
}

type RouteItemProps = {
  route: ResolvedRouteData;
  isSelected: boolean;
  isSuggested: boolean;
  isBestSuggestion: boolean;
  isAlternativeSuggestion: boolean;
  nearbyRank: number | undefined;
  isNearby: boolean;
  isLandmarkMatch: boolean;
  matchedLandmark: string | null;
  suggestionDir: RouteDirection | undefined;
  showDivider: boolean;
  showFavoritesHeader: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (routeName: string) => void;
  onSelectRoute: (id: number) => void;
  onHoverRoute?: (routeId: number | null) => void;
};

const RouteItem = memo(function RouteItem({
  route,
  isSelected,
  isSuggested,
  isBestSuggestion,
  isAlternativeSuggestion,
  nearbyRank,
  isNearby,
  isLandmarkMatch,
  matchedLandmark,
  suggestionDir,
  showDivider,
  showFavoritesHeader,
  isFavorite,
  onToggleFavorite,
  onSelectRoute,
  onHoverRoute,
}: RouteItemProps) {
  return (
    <li style={{ contentVisibility: "auto", containIntrinsicSize: "0 72px" }}>
      {showFavoritesHeader && (
        <div className="flex items-center gap-2 pb-1 pt-0.5" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-lima">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
            </svg>
            Favoritas
          </span>
          <span className="flex-1 border-t border-lima/20" />
        </div>
      )}
      {showDivider && (
        <div className="flex items-center gap-2 pb-2 pt-1" aria-hidden="true">
          <span className="flex-1 border-t border-slate-200/70 dark:border-slate-700/70" />
          <span className="ov-text-muted text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--ov-text-muted)" }}>
            Otras rutas
          </span>
          <span className="flex-1 border-t border-slate-200/70 dark:border-slate-700/70" />
        </div>
      )}
      <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={() => onSelectRoute(route.id)}
        onMouseEnter={onHoverRoute ? () => onHoverRoute(route.id) : undefined}
        onMouseLeave={onHoverRoute ? () => onHoverRoute(null) : undefined}
        style={
          !isSelected && !isLandmarkMatch && !isNearby && !isBestSuggestion && !isSuggested
            ? { borderColor: "var(--ov-border)", background: "var(--surface)" }
            : undefined
        }
        className={`flex min-h-16 w-full min-w-0 flex-1 items-stretch justify-between rounded-2xl border px-2 py-3 text-left transition active:scale-[0.995] ${
          isSelected
            ? "border-lima/70 bg-lima/10 shadow-[0_4px_24px_rgba(184,232,64,0.08)]"
            : isLandmarkMatch
              ? "border-teal-400/60 bg-teal-500/8"
              : isNearby
                ? "border-lima/50 bg-lima/8"
                : isBestSuggestion
                  ? "border-emerald-400/70 bg-emerald-500/10"
                  : isSuggested
                    ? "border-lima/30 bg-lima/5"
                    : "hover:border-lima/20"
        }`}
      >
        <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: route.color }} />
        <span className="ml-3 flex flex-1 items-center gap-3">
          {isNearby ? (
            <span className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-full bg-lima/15 text-[10px] font-bold leading-none text-lima">
              #{(nearbyRank ?? 0) + 1}
            </span>
          ) : null}
          <span className="min-w-0">
            {(() => {
              const destino = getRouteDestination(route.ruta);
              const availability = route.tieneIda && route.tieneVuelta
                ? "Ida y vuelta disponibles"
                : route.tieneIda
                  ? "Solo ida disponible"
                  : "Solo vuelta disponible";
              return destino ? (
                <>
                  <span className="ov-text block truncate font-display text-sm font-bold">{destino}</span>
                  <span className="ov-text-muted block text-[11px]">
                    <span className="font-semibold">{route.ruta}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {isLandmarkMatch && matchedLandmark
                      ? <span className="text-teal-400">Pasa por: {matchedLandmark.charAt(0).toUpperCase() + matchedLandmark.slice(1)}</span>
                      : availability}
                  </span>
                </>
              ) : (
                <>
                  <span className="ov-text block font-display text-sm font-bold">{route.nombre}</span>
                  <span className="ov-text-muted block text-[11px]">
                    {isLandmarkMatch && matchedLandmark
                      ? <span className="text-teal-400">Pasa por: {matchedLandmark.charAt(0).toUpperCase() + matchedLandmark.slice(1)}</span>
                      : availability}
                  </span>
                </>
              );
            })()}
          </span>
        </span>

        <span className="ml-2 flex items-center gap-1.5">
          {isLandmarkMatch && (
            <span className="rounded-full bg-teal-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-teal-400">
              POR AQUÍ
            </span>
          )}
          {isNearby && !isSelected && (
            <span className="rounded-full bg-lima/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-lima">
              CERCANA
            </span>
          )}
          {isBestSuggestion && (
            <span className="rounded-full bg-lima/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-lima">
              MEJOR
            </span>
          )}
          {isAlternativeSuggestion && (
            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              ALTERNATIVA
            </span>
          )}
          {isSuggested && suggestionDir !== undefined && (
            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
              {suggestionDir === "ida" ? "IDA" : "VUELTA"}
            </span>
          )}
          {isSelected && <span className="rounded-full bg-lima/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-lima">ACTIVA</span>}
        </span>
      </button>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(route.ruta)}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Quitar ${route.ruta} de favoritas` : `Guardar ${route.ruta} en favoritas`}
          style={!isFavorite ? { borderColor: "var(--ov-border)", background: "var(--surface)" } : undefined}
          className={`flex w-10 shrink-0 items-center justify-center rounded-2xl border transition active:scale-[0.95] ${
            isFavorite
              ? "border-lima/50 bg-lima/10 text-lima"
              : "ov-text-muted hover:border-lima/40 hover:text-lima"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            className="h-4.5 w-4.5"
            style={{ width: 18, height: 18 }}
            aria-hidden="true"
          >
            <path
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
              stroke="currentColor"
              strokeWidth={isFavorite ? 0 : 1.8}
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      </div>
    </li>
  );
});

export default function RouteList({
  routes,
  isLoading = false,
  suggestedRouteIds,
  suggestedRouteDirections,
  bestSuggestedRouteId,
  alternativeSuggestedRouteIds = [],
  nearbyRouteIds,
  selectedRouteId,
  landmarksByRouteName,
  favoriteRouteNames,
  onToggleFavorite,
  onSelectRoute,
  onClearSelection,
  onShowTeleferico,
  onHoverRoute
}: RouteListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim();

  const searchableRoutes = useMemo(
    () =>
      routes.map((route) => {
        const landmarks = landmarksByRouteName?.get(route.ruta) ?? [];
        return {
          ...route,
          _destino: getRouteDestination(route.ruta) ?? "",
          _terminos: getRouteSearchTerms(route.ruta).join(" "),
          _landmarks: landmarks.map((lm) => lm.name).join(" ")
        };
      }),
    [routes, landmarksByRouteName]
  );

  // Inverted index: landmark name → set of route names that have it
  const landmarkRouteMap = useMemo(() => {
    const map = new Map<string, LandmarkSearchEntry>();
    if (!landmarksByRouteName) return map;
    for (const [routeName, landmarks] of landmarksByRouteName) {
      for (const lm of landmarks) {
        const key = normalizeSearchValue(lm.name);
        let entry = map.get(key);
        if (!entry) {
          entry = { label: lm.name, routeNames: new Set() };
          map.set(key, entry);
        }
        entry.routeNames.add(routeName);
      }
    }
    return map;
  }, [landmarksByRouteName]);

  // Find which landmark the query matched (for badge display).
  const matchedLandmark = findMatchedLandmark(normalizedQuery, landmarkRouteMap);

  const fuse = useMemo(
    () =>
      new Fuse(searchableRoutes, {
        keys: [
          { name: "nombre", weight: 0.4 },
          { name: "_destino", weight: 0.4 },
          { name: "_terminos", weight: 0.2 },
          { name: "_landmarks", weight: 0.3 }
        ],
        threshold: 0.35,
        minMatchCharLength: 1,
        includeScore: false
      }),
    [searchableRoutes]
  );

  const hasNearby = nearbyRouteIds.length > 0;
  const telefericoRouteId = useMemo(() => {
    const telefericoRoute = routes.find(isTelefericoRoute);
    return telefericoRoute ? telefericoRoute.id : null;
  }, [routes]);

  const handleShowTelefericoOnMap = () => {
    if (telefericoRouteId === null) {
      onShowTeleferico?.();
      return;
    }

    if (selectedRouteId !== telefericoRouteId) {
      onSelectRoute(telefericoRouteId);
      return;
    }

    onShowTeleferico?.();
  };

  // Build a lookup: routeId → position in nearbyRouteIds (0 = nearest)
  const nearbyRankMap = useMemo(
    () => new Map(nearbyRouteIds.map((id, i) => [id, i])),
    [nearbyRouteIds]
  );

  const suggestedRankMap = useMemo(
    () => new Map(suggestedRouteIds.map((id, i) => [id, i])),
    [suggestedRouteIds]
  );
  const alternativeSuggestedSet = useMemo(
    () => new Set(alternativeSuggestedRouteIds),
    [alternativeSuggestedRouteIds]
  );
  const hasSuggested = suggestedRouteIds.length > 0;

  // Set of route names that pass through the matched landmark
  const landmarkMatchingRouteNames = matchedLandmark
    ? landmarkRouteMap.get(matchedLandmark.key)?.routeNames ?? EMPTY_ROUTE_NAMES
    : EMPTY_ROUTE_NAMES;
  const reportHref = useMemo(() => {
    const params = new URLSearchParams({ from: "mapa" });
    const selectedRouteName = routes.find((route) => route.id === selectedRouteId)?.ruta;
    if (selectedRouteName) params.set("ruta", selectedRouteName);
    if (matchedLandmark?.label) params.set("referencia", matchedLandmark.label);
    return `/reportar-error?${params.toString()}`;
  }, [matchedLandmark, routes, selectedRouteId]);

  const filteredRoutes = useMemo(() => {
    const searchResults = normalizedQuery
      ? fuse.search(normalizedQuery).map((result) => result.item)
      : searchableRoutes;

    // Direct landmark matches must not depend on Fuse's field-length score.
    if (normalizedQuery && landmarkMatchingRouteNames.size > 0) {
      const landmarkRoutes = searchableRoutes.filter((route) => landmarkMatchingRouteNames.has(route.ruta));
      const directRouteNames = new Set(landmarkRoutes.map((route) => route.ruta));
      return [...landmarkRoutes, ...searchResults.filter((route) => !directRouteNames.has(route.ruta))];
    }

    const base = searchResults;

    // Fijar arriba sugeridas (mejor primero), luego cercanas, luego
    // favoritas y al final el resto. Con búsqueda activa solo se fijan
    // las cercanas (la relevancia de la búsqueda manda).
    const pinSuggested = hasSuggested && !normalizedQuery;
    const hasFavorites = !normalizedQuery && !!favoriteRouteNames && favoriteRouteNames.size > 0;
    if (!pinSuggested && !hasNearby && !hasFavorites) return base;

    const suggested: ResolvedRouteData[] = [];
    const nearby: ResolvedRouteData[] = [];
    const favorites: ResolvedRouteData[] = [];
    const rest: ResolvedRouteData[] = [];

    for (const route of base) {
      if (pinSuggested && suggestedRankMap.has(route.id)) {
        suggested.push(route);
      } else if (nearbyRankMap.has(route.id)) {
        nearby.push(route);
      } else if (hasFavorites && favoriteRouteNames?.has(route.ruta)) {
        favorites.push(route);
      } else {
        rest.push(route);
      }
    }

    suggested.sort((a, b) => (suggestedRankMap.get(a.id) ?? 0) - (suggestedRankMap.get(b.id) ?? 0));
    nearby.sort((a, b) => (nearbyRankMap.get(a.id) ?? 0) - (nearbyRankMap.get(b.id) ?? 0));

    return [...suggested, ...nearby, ...favorites, ...rest];
  }, [normalizedQuery, searchableRoutes, hasNearby, hasSuggested, suggestedRankMap, nearbyRankMap, landmarkMatchingRouteNames, fuse, favoriteRouteNames]);

  const visibleFilteredRoutes = useMemo(
    () => normalizedQuery ? filteredRoutes : filteredRoutes.filter((route) => !isTelefericoRoute(route)),
    [filteredRoutes, normalizedQuery]
  );

  return (
    <div className="space-y-5">
      {/* Header section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="ov-text text-lg font-bold tracking-tight">Rutas disponibles</h2>
            <p className="ov-text-muted mt-0.5 text-[13px]">
              Toca una ruta para verla en el mapa.
            </p>
          </div>
          {selectedRouteId !== null && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="ov-pill ov-border ov-text-muted shrink-0 rounded-xl border px-3 py-2 text-[12px] font-semibold transition hover:opacity-80 active:scale-[0.97]"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Route count */}
        <span className="ov-text-muted text-[12px] font-medium">
          {visibleFilteredRoutes.length} ruta{visibleFilteredRoutes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="sr-only">Buscar ruta por colonia o número</span>
          <div className="map-search-field relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Número de ruta o lugar"
              autoComplete="off"
              inputMode="search"
              className="map-search-input h-12 w-full rounded-xl border pl-10 pr-12 text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-0.5 top-0.5 grid h-11 w-11 place-items-center rounded-lg transition hover:bg-black/10"
                aria-label="Limpiar busqueda"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </label>

        {/* Quick-search chips — hidden while user has typed something */}
        {!query && (
          <div className="flex flex-wrap gap-1.5" aria-label="Búsquedas rápidas">
            {["Jucutacato", "Constituyentes", "Pemex", "Taximacuaro", "Central", "Balcones"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setQuery(chip)}
                className="ov-pill ov-border ov-text-muted rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:border-lima/40 hover:text-lima active:scale-[0.97]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Teleférico featured card (hidden while searching) ────────────── */}
      {!normalizedQuery && (
        <TelefericoSection
          onShowOnMap={handleShowTelefericoOnMap}
          isSuggested={telefericoRouteId !== null && suggestedRouteIds.includes(telefericoRouteId)}
        />
      )}

      {/* Skeleton rows durante la carga inicial — reemplazan el spinner generico */}
      {isLoading ? (
        <ul className="space-y-2 pb-10" aria-busy="true" aria-label="Cargando rutas">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <div
                className="flex min-h-16 w-full items-stretch gap-3 rounded-2xl px-2 py-3"
                style={{ border: "1px solid var(--ov-border)", background: "var(--surface)" }}
              >
                {/* Color strip skeleton */}
                <div
                  className="w-1 self-stretch rounded-full animate-pulse"
                  style={{ background: "var(--ov-border2, var(--ov-border))" }}
                />
                <div className="ml-1 flex flex-1 flex-col justify-center gap-2 py-0.5">
                  {/* Route name skeleton — varying widths for realistic feel */}
                  <div
                    className="h-3.5 animate-pulse rounded-full"
                    style={{ width: `${52 + (i % 3) * 14}%`, animationDelay: `${i * 80}ms`, background: "var(--ov-border)" }}
                  />
                  {/* Subtitle skeleton */}
                  <div
                    className="h-2.5 animate-pulse rounded-full"
                    style={{ width: `${36 + (i % 2) * 12}%`, animationDelay: `${i * 80 + 40}ms`, background: "var(--ov-pill-bg)" }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : visibleFilteredRoutes.length > 0 ? (
        <ul className="space-y-2 pb-10">
          {/* Section header when nearby routes are active */}
          {hasNearby && !normalizedQuery && (
            <li aria-hidden="true">
              <div className="flex items-center gap-2 pb-1 pt-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-lima">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Cercanas a ti
                </span>
                <span className="flex-1 border-t border-lima/20" />
              </div>
            </li>
          )}

          {visibleFilteredRoutes.map((route, listIndex) => {
            const isSelected = selectedRouteId === route.id;
            const isSuggested = suggestedRouteIds.includes(route.id);
            const isBestSuggestion = bestSuggestedRouteId === route.id;
            const isAlternativeSuggestion = !isBestSuggestion && alternativeSuggestedSet.has(route.id);
            const nearbyRank = nearbyRankMap.get(route.id);
            const isNearby = nearbyRank !== undefined;
            const isLandmarkMatch = !!(normalizedQuery && landmarkMatchingRouteNames.has(route.ruta));
            const suggestionDir = suggestedRouteDirections?.get(route.id);
            const isFavorite = favoriteRouteNames?.has(route.ruta) ?? false;
            // Una ruta pertenece al grupo "Favoritas" si está fijada como
            // favorita pero no en un grupo de mayor prioridad (sugerida/cercana).
            const inFavoriteGroup = !normalizedQuery && isFavorite && !isNearby && !(suggestedRankMap.size > 0 && suggestedRankMap.has(route.id));
            const prevRoute = visibleFilteredRoutes[listIndex - 1];
            const prevIsNearby = prevRoute !== undefined && nearbyRankMap.has(prevRoute.id);
            const prevInFavoriteGroup =
              prevRoute !== undefined &&
              !normalizedQuery &&
              (favoriteRouteNames?.has(prevRoute.ruta) ?? false) &&
              !nearbyRankMap.has(prevRoute.id) &&
              !(suggestedRankMap.size > 0 && suggestedRankMap.has(prevRoute.id));
            const showFavoritesHeader = inFavoriteGroup && !prevInFavoriteGroup;
            const showDivider =
              !normalizedQuery &&
              !isNearby &&
              !inFavoriteGroup &&
              (prevIsNearby || prevInFavoriteGroup);

            return (
              <RouteItem
                key={route.id}
                route={route}
                isSelected={isSelected}
                isSuggested={isSuggested}
                isBestSuggestion={isBestSuggestion}
                isAlternativeSuggestion={isAlternativeSuggestion}
                nearbyRank={nearbyRank}
                isNearby={isNearby}
                isLandmarkMatch={isLandmarkMatch}
                matchedLandmark={matchedLandmark?.label ?? null}
                suggestionDir={suggestionDir}
                showDivider={showDivider}
                showFavoritesHeader={showFavoritesHeader}
                isFavorite={isFavorite}
                onToggleFavorite={isTelefericoRoute(route) ? undefined : onToggleFavorite}
                onSelectRoute={onSelectRoute}
                onHoverRoute={onHoverRoute}
              />
            );
          })}
        </ul>
      ) : (
        <div className="ov-panel ov-border flex flex-col items-center gap-3 rounded-2xl border px-4 py-8 text-center">
          <div className="ov-pill flex h-12 w-12 items-center justify-center rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-6 w-6" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8.5 11h5M11 8.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
            </svg>
          </div>
          <div>
            <p className="ov-text text-[14px] font-semibold">Sin resultados</p>
            <p className="ov-text-muted mt-1 text-[12px]">
              No hay rutas con ese nombre. Prueba con otra palabra.
            </p>
          </div>
        </div>
      )}

      <Link
        href={reportHref}
        className="ov-pill ov-border ov-text-muted inline-flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-center text-[12px] font-semibold transition hover:border-lima/40 hover:text-lima"
      >
        ¿Viste una ruta mal? Reportar error
      </Link>
    </div>
  );
}


"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { ArrowRight, Building2, MapPin, Search } from "lucide-react";
import { searchLocalPlaces, searchPlaces, type PlaceResult } from "@/lib/geocode";
import { addRecentPlace, getRecentPlaces } from "@/lib/recent-places";
import { getSavedPlaces, setSavedPlace, SAVED_SLOT_LABELS, type SavedSlot } from "@/lib/saved-places";

const DEBOUNCE_MS = 450;

function mapHref(result: PlaceResult): string {
  const [lng, lat] = result.center;
  const params = new URLSearchParams({
    b: `${lng.toFixed(6)},${lat.toFixed(6)}`,
    destino: result.label,
  });
  if (result.source === "mapbox") params.set("tmp", "1");
  return `/mapa?${params.toString()}`;
}

export default function LandingSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [recents, setRecents] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<ReturnType<typeof getSavedPlaces>>({});
  const [savingSlot, setSavingSlot] = useState<SavedSlot | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastTrackedQueryRef = useRef("");
  const listboxId = useId();

  // Con el input casi vacío mostramos los destinos recientes.
  const showingRecents = query.trim().length < 2;
  const displayResults = showingRecents ? recents : results;

  const updateQuery = (value: string) => {
    const trimmed = value.trim();
    setQuery(value);
    setResults(trimmed.length >= 2 ? searchLocalPlaces(trimmed) : []);
    setIsSearching(trimmed.length >= 2);
    setActiveIndex(-1);
  };

  // Telemetría: búsquedas sin resultados → candidatos para el índice local.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isSearching || results.length > 0) return;
    if (lastTrackedQueryRef.current === trimmed) return;
    const timer = window.setTimeout(() => {
      lastTrackedQueryRef.current = trimmed;
      try {
        track("busqueda_sin_resultados", {
          longitud: Math.min(trimmed.length, 100),
          origen: "landing",
        });
      } catch {
        // analytics no disponible: ignorar
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, isSearching, results]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, { signal: controller.signal })
        .then(setResults)
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const goTo = (result: PlaceResult) => {
    if (savingSlot) {
      setSavedPlace(savingSlot, result);
      setSavedPlaces(getSavedPlaces());
      setSavingSlot(null);
    }
    addRecentPlace(result);
    setIsOpen(false);
    router.push(mapHref(result));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = activeIndex >= 0 ? displayResults[activeIndex] : results[0];
    if (target) {
      goTo(target);
      return;
    }
    // Sin sugerencia: deja que el mapa geocodifique el texto libre.
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/mapa?destino=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/mapa");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (displayResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (i + 1) % displayResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? displayResults.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* action/method reales → la búsqueda funciona incluso sin JavaScript */}
      <form
        action="/mapa"
        method="get"
        onSubmit={handleSubmit}
        className="public-directory rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] p-1.5 focus-within:ring-2 focus-within:ring-[#b8e840]"
      >
        <label className="sr-only" htmlFor="destino">¿A dónde vas?</label>
        <div className="flex gap-1 sm:gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--public-muted)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <input
              id="destino"
              name="destino"
              value={query}
              autoComplete="off"
              onChange={(event) => { updateQuery(event.target.value); setIsOpen(true); }}
              onFocus={() => {
                setRecents(getRecentPlaces());
                setSavedPlaces(getSavedPlaces());
                if (results.length > 0 || query.trim().length < 2) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Negocio, hotel, colonia o lugar…"
              aria-label="Buscar destino"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
              className="h-12 w-full rounded-md border-0 bg-transparent pl-10 pr-9 text-sm font-medium text-[var(--public-ink)] outline-none placeholder:text-[var(--public-muted)]"
            />
            {isSearching && (
              <span
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--lima)", borderTopColor: "transparent" }}
                aria-hidden="true"
              />
            )}
          </div>
          <button
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#b8e840] text-sm font-bold text-[#14200c] transition hover:bg-[#c8f25b] sm:w-auto sm:px-5"
            type="submit"
            aria-label="Buscar ruta"
            title="Buscar ruta"
          >
            <span className="hidden sm:inline">Buscar ruta</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {isOpen && (showingRecents || displayResults.length > 0) && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-lg border p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          style={{ background: "var(--surface)", borderColor: "var(--ov-border)" }}
        >
          {savingSlot && (
            <li
              role="presentation"
              className="mb-1 flex items-center gap-2 rounded-xl border px-3 py-2"
              style={{ borderColor: "rgba(184,232,64,0.3)", background: "rgba(184,232,64,0.08)" }}
            >
              <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--ink)" }}>
                Busca un lugar y selecciónalo para guardarlo como{" "}
                <span className="font-bold" style={{ color: "var(--lima)" }}>{SAVED_SLOT_LABELS[savingSlot]}</span>
              </span>
              <button
                type="button"
                onClick={() => setSavingSlot(null)}
                className="shrink-0 text-[11px] font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--muted)" }}
              >
                Cancelar
              </button>
            </li>
          )}
          {showingRecents && !savingSlot &&
            (["casa", "trabajo"] as const).map((slot) => {
              const saved = savedPlaces[slot];
              return (
                <li key={slot} role="presentation">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => (saved ? goTo(saved) : setSavingSlot(slot))}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:opacity-90"
                    >
                      {slot === "casa" ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                          <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} aria-hidden="true">
                          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                          {SAVED_SLOT_LABELS[slot]}
                        </span>
                        <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>
                          {saved ? saved.label : "Toca para configurar"}
                        </span>
                      </span>
                    </button>
                    {saved && (
                      <button
                        type="button"
                        onClick={() => setSavingSlot(slot)}
                        aria-label={`Cambiar ${SAVED_SLOT_LABELS[slot]}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:opacity-80"
                        style={{ background: "rgba(106,171,72,0.12)", color: "var(--muted)" }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14 6.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          {showingRecents && displayResults.length > 0 && (
            <li
              role="presentation"
              className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--muted)" }}
            >
              Recientes
            </li>
          )}
          {displayResults.map((result, index) => (
            <li key={`${result.label}-${result.center.join(",")}`} role="presentation">
              <button
                id={`${listboxId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => goTo(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition"
                style={index === activeIndex ? { background: "var(--verde-l)" } : undefined}
              >
                {showingRecents ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" style={{ color: "var(--muted)" }} aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : result.kind === "business" ? (
                  <Building2 className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--lima)" }} strokeWidth={1.8} aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{result.label}</span>
                  <span className="block truncate text-[11px]" style={{ color: "var(--muted)" }}>
                    {showingRecents
                      ? "Búsqueda reciente"
                      : result.source === "local"
                        ? "Lugar conocido"
                        : result.description ?? (result.kind === "business" ? "Comercio o servicio" : "Uruapan, Mich.")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

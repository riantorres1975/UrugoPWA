"use client";

import { useEffect, useId, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Building2, MapPin } from "lucide-react";
import { searchLocalPlaces, searchPlaces, type PlaceResult } from "@/lib/geocode";
import { addRecentPlace, getRecentPlaces } from "@/lib/recent-places";
import { getSavedPlaces, setSavedPlace, SAVED_SLOT_LABELS, type SavedSlot } from "@/lib/saved-places";

type PlaceSearchProps = {
  placeholder?: string;
  label?: string;
  onSelect: (result: PlaceResult) => void;
  autoFocus?: boolean;
  /** Texto inicial del input (p. ej. el destino que llegó por URL) */
  initialQuery?: string;
};

const DEBOUNCE_MS = 450;

export default function PlaceSearch({
  placeholder = "Busca una colonia, hospital, plaza…",
  label = "Buscar lugar",
  onSelect,
  autoFocus = false,
  initialQuery = "",
}: PlaceSearchProps) {
  const initialTrimmed = initialQuery.trim();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[]>(() =>
    initialTrimmed.length >= 2 ? searchLocalPlaces(initialTrimmed) : []
  );
  const [recents, setRecents] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<ReturnType<typeof getSavedPlaces>>({});
  const [savingSlot, setSavingSlot] = useState<SavedSlot | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(initialTrimmed.length >= 2);
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

  // Telemetría: registrar búsquedas que no encontraron nada (tras estabilizarse)
  // para saber qué lugares agregar al índice local.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || isSearching || results.length > 0) return;
    if (lastTrackedQueryRef.current === trimmed) return;
    const timer = window.setTimeout(() => {
      lastTrackedQueryRef.current = trimmed;
      try {
        track("busqueda_sin_resultados", {
          longitud: Math.min(trimmed.length, 100),
          origen: "mapa",
        });
      } catch {
        // analytics no disponible: ignorar
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, isSearching, results]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Búsqueda: resultados locales instantáneos + comercios/direcciones con debounce.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(trimmed, { signal: controller.signal })
        .then((merged) => {
          setResults(merged);
        })
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

  const handleSelect = (result: PlaceResult) => {
    if (savingSlot) {
      setSavedPlace(savingSlot, result);
      setSavedPlaces(getSavedPlaces());
      setSavingSlot(null);
    }
    addRecentPlace(result);
    setRecents(getRecentPlaces());
    document.querySelector<HTMLInputElement>("input:focus")?.blur();
    onSelect(result);
    // Limpiar el buscador tras aplicar la búsqueda (el destino queda marcado en el mapa).
    updateQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || displayResults.length === 0) {
      if (event.key === "ArrowDown" && displayResults.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        event.preventDefault();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % displayResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? displayResults.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = displayResults[activeIndex] ?? displayResults[0];
      if (target) handleSelect(target);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="ov-text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          inputMode="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => {
            updateQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setRecents(getRecentPlaces());
            setSavedPlaces(getSavedPlaces());
            if (results.length > 0 || query.trim().length < 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          style={{ background: "var(--ov-bg)", color: "var(--ov-text)", borderColor: "var(--ov-border)" }}
          className="h-12 w-full rounded-2xl border pl-10 pr-11 text-sm outline-none shadow-soft backdrop-blur-xl transition focus:border-lima/40 focus:ring-1 focus:ring-lima/10 [&::placeholder]:opacity-40"
        />
        {isSearching ? (
          <span
            className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-lima/60 border-t-transparent"
            aria-hidden="true"
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              updateQuery("");
              setIsOpen(false);
            }}
            className="ov-pill ov-text-muted absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full transition hover:opacity-80"
            aria-label="Limpiar búsqueda"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {isOpen && (showingRecents || displayResults.length > 0) && (
        <ul
          id={listboxId}
          role="listbox"
          // Keep the keyboard/layout stable until click applies the selection.
          // Unlike touchstart cancellation, this still allows touch scrolling.
          onMouseDown={(event) => event.preventDefault()}
          className="ov-panel absolute z-50 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          style={{ borderColor: "var(--ov-border)" }}
        >
          {savingSlot && (
            <li role="presentation" className="mb-1 flex items-center gap-2 rounded-xl border border-lima/30 bg-lima/10 px-3 py-2">
              <span className="ov-text flex-1 text-[12px] font-medium">
                Busca un lugar y selecciónalo para guardarlo como{" "}
                <span className="font-bold text-lima">{SAVED_SLOT_LABELS[savingSlot]}</span>
              </span>
              <button
                type="button"
                onClick={() => setSavingSlot(null)}
                className="ov-text-muted shrink-0 text-[11px] font-semibold underline-offset-2 hover:underline"
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
                      onClick={() => (saved ? handleSelect(saved) : setSavingSlot(slot))}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-lima/5"
                    >
                      {slot === "casa" ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-lima" aria-hidden="true">
                          <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-lima" aria-hidden="true">
                          <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="ov-text block truncate text-[13px] font-semibold">{SAVED_SLOT_LABELS[slot]}</span>
                        <span className="ov-text-muted block truncate text-[11px]">
                          {saved ? saved.label : "Toca para configurar"}
                        </span>
                      </span>
                    </button>
                    {saved && (
                      <button
                        type="button"
                        onClick={() => setSavingSlot(slot)}
                        aria-label={`Cambiar ${SAVED_SLOT_LABELS[slot]}`}
                        className="ov-pill ov-text-muted grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:opacity-80"
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
            <li role="presentation" className="ov-text-muted px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-widest">
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
                onClick={() => handleSelect(result)}
                className={`flex w-full select-none items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  index === activeIndex ? "bg-lima/10" : "hover:bg-lima/5"
                }`}
              >
                {showingRecents ? (
                  <svg viewBox="0 0 24 24" fill="none" className="ov-text-muted h-4 w-4 shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : result.kind === "business" ? (
                  <Building2 className="h-4 w-4 shrink-0 text-lima" strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <MapPin className="h-4 w-4 shrink-0 text-lima" strokeWidth={1.8} aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="ov-text block truncate text-[13px] font-semibold">{result.label}</span>
                  <span className="ov-text-muted block truncate text-[11px]">
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

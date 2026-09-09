"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";

type RutasFilterProps = {
  total: number;
  /** id del contenedor con las tarjetas (cada una con data-search) */
  gridId?: string;
  /** id del elemento "sin resultados" a mostrar/ocultar */
  emptyId?: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function RutasFilter({ total, gridId = "rutas-grid", emptyId = "rutas-empty" }: RutasFilterProps) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(total);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTrackedQueryRef = useRef("");

  // Telemetría: filtros sin resultados → rutas/alias que faltan en los datos.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || count > 0) return;
    if (lastTrackedQueryRef.current === trimmed) return;
    const timer = window.setTimeout(() => {
      lastTrackedQueryRef.current = trimmed;
      try {
        track("busqueda_sin_resultados", {
          longitud: Math.min(trimmed.length, 100),
          origen: "rutas",
        });
      } catch {
        // analytics no disponible: ignorar
      }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query, count]);

  // Filtra las tarjetas renderizadas en el servidor desde la acción del usuario.
  const applyFilter = useCallback((value: string) => {
    const grid = document.getElementById(gridId);
    if (!grid) return total;

    const q = normalize(value);
    // Multi-token AND: "hospital ruta 5" encuentra tarjetas que contengan
    // todas las palabras, sin importar el orden.
    const tokens = q.split(" ").filter(Boolean);
    const cards = grid.querySelectorAll<HTMLElement>("[data-search]");
    let visible = 0;

    cards.forEach((el) => {
      const hay = el.getAttribute("data-search") ?? "";
      const match = tokens.length === 0 || tokens.every((token) => hay.includes(token));
      el.style.display = match ? "" : "none";
      if (match) visible += 1;
    });

    setCount(visible);

    const empty = document.getElementById(emptyId);
    if (empty) empty.style.display = visible === 0 ? "" : "none";
    return visible;
  }, [emptyId, gridId, total]);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setCount(applyFilter(value));
  }, [applyFilter]);

  return (
    <div
      className="sticky top-[72px] z-30 mb-6 border-b pb-4 pt-1"
      style={{ borderColor: "var(--public-border)", background: "var(--public-bg)" }}
    >
      <label className="block">
        <span className="sr-only">Buscar ruta por número, colonia o destino</span>
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--public-muted)" }}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Busca por número, colonia o destino…"
            aria-label="Filtrar rutas"
            className="h-12 w-full rounded-lg border pl-11 pr-11 text-sm font-medium outline-none transition placeholder:text-[var(--public-muted)]"
            style={{ background: "var(--public-surface)", borderColor: "var(--public-border)", color: "var(--public-ink)" }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-2.5 grid h-7 w-7 place-items-center rounded-full transition hover:opacity-80"
              style={{ background: "var(--public-surface)", color: "var(--public-secondary)" }}
              aria-label="Limpiar búsqueda"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </label>
      {!query && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 px-1" aria-label="Búsquedas rápidas">
          {["Centro", "Central", "Hospital Regional", "Jucutacato", "Pemex", "Balcones"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                updateQuery(chip);
                inputRef.current?.focus();
              }}
              className="rounded-md border px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-80 active:scale-[0.97]"
              style={{ borderColor: "var(--public-border)", background: "var(--public-surface)", color: "var(--public-secondary)" }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 px-1 text-[12px] font-semibold" style={{ color: "var(--public-muted)" }} aria-live="polite">
        {count} {count === 1 ? "ruta" : "rutas"}
        {query && ` para “${query.trim()}”`}
      </p>
    </div>
  );
}

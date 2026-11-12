"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Search, X } from "lucide-react";
import { matchesPublicRoute, normalizeRouteSearch } from "@/lib/public-route-search";
import { useDirectoryUrl } from "@/lib/use-directory-url";

type RutasFilterProps = {
  total: number;
  /** id del contenedor con las tarjetas (cada una con data-search) */
  gridId?: string;
  /** id del elemento "sin resultados" a mostrar/ocultar */
  emptyId?: string;
};

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

    const cards = grid.querySelectorAll<HTMLElement>("[data-search]");
    let visible = 0;

    cards.forEach((el) => {
      const hay = el.getAttribute("data-search") ?? "";
      const match = matchesPublicRoute(value, el.dataset.routeName ?? "", hay);
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

  useDirectoryUrl(query, updateQuery);

  return (
    <div className="public-directory transport-toolbar">
        <div className="transport-search">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            maxLength={120}
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Ruta, colonia o lugar…"
            aria-label="Filtrar rutas"
            autoComplete="off"
            aria-controls={gridId}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="transport-chips" aria-label="Búsquedas rápidas">
          {["Centro", "Central", "Hospital Regional", "Jucutacato", "Pemex", "Balcones"].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                updateQuery(normalizeRouteSearch(query) === normalizeRouteSearch(chip) ? "" : chip);
              }}
              className="transport-chip"
              aria-pressed={normalizeRouteSearch(query) === normalizeRouteSearch(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      <div className="transport-results"><p aria-live="polite" aria-atomic="true">
        {count} {count === 1 ? "ruta" : "rutas"}
        {query && ` para “${query.trim()}”`}
      </p>{query && <button type="button" onClick={() => updateQuery("")}>Ver todas las rutas</button>}</div>
    </div>
  );
}

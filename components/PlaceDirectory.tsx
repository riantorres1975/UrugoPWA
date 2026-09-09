"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Place = {
  slug: string;
  label: string;
  routeCount: number;
  category: string;
};

const categories = ["Todos", "Salud", "Educación", "Compras", "Gobierno", "Recreación"];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function PlaceDirectory({ places }: { places: Place[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const filtered = useMemo(() => {
    const search = normalize(query.trim());
    return places.filter((place) =>
      (category === "Todos" || place.category === category) &&
      (!search || normalize(place.label).includes(search))
    );
  }, [category, places, query]);

  return (
    <section className="public-directory -mx-5 mt-8 px-5 pb-6 sm:mx-0 sm:px-6">
      <div className="sticky top-[72px] z-20 -mx-1 border-y border-[var(--public-border)] bg-[var(--public-bg)] px-1 py-4">
        <label className="relative block">
          <span className="sr-only">Buscar hospital, escuela, plaza o lugar</span>
          <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--public-muted)]" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca un hospital, escuela, plaza o colonia"
            className="h-12 w-full rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] pl-12 pr-4 text-sm text-[var(--public-ink)] outline-none placeholder:text-[var(--public-muted)] focus:border-[#b8e840]/50"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filtrar lugares por categoría">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-bold transition"
              style={{
                borderColor: category === item ? "#6aab48" : "var(--public-border)",
                background: category === item ? "var(--public-surface)" : "transparent",
                color: category === item ? "var(--public-accent)" : "var(--public-secondary)",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="my-4 text-xs font-semibold uppercase text-[var(--public-muted)]">
        {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}
      </p>
      <div className="grid min-w-0 border-t border-[var(--public-border)] md:grid-cols-2 md:gap-x-8">
        {filtered.map((place) => (
          <Link
            key={place.slug}
            href={`/como-llegar/${place.slug}`}
            className="group flex min-w-0 items-center gap-3 border-b border-[var(--public-border)] py-4 transition [contain-intrinsic-size:auto_76px] [content-visibility:auto] hover:bg-[var(--public-hover)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#6aab48]/10 text-[var(--public-accent)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-sans text-base font-bold text-[var(--public-ink)]">{place.label}</span>
              <span className="mt-1 block text-xs text-[var(--public-muted)]">
                {place.routeCount} {place.routeCount === 1 ? "ruta te deja" : "rutas te dejan"} cerca · {place.category}
              </span>
            </span>
            <span className="shrink-0 text-[var(--public-accent)] transition group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="rounded-lg border border-[var(--public-border)] px-5 py-12 text-center text-sm text-[var(--public-secondary)]">
          No encontramos ese lugar. Prueba con otro nombre o abre el mapa para marcarlo manualmente.
        </div>
      )}
    </section>
  );
}

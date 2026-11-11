"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";

const filters = [
  { id: "all", label: "Todos" },
  { id: "salud", label: "Salud" },
  { id: "conexiones", label: "Conexiones" },
  { id: "paseo", label: "Paseo" },
] as const;

type Filter = typeof filters[number]["id"];
export type LandingDestination = {
  label: string;
  slug: string;
  category: Exclude<Filter, "all">;
  routeCount: number;
  nearestWalkMin: number;
};

export default function LandingDestinations({ places }: { places: LandingDestination[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = places.filter((place) => filter === "all" || place.category === filter);

  return (
    <section id="destinos" className="home-anchor" aria-labelledby="destination-title">
      <p className="micro label">01 / Explora la ciudad</p>
      <h2 id="destination-title">Tus destinos, <em>más cerca.</em></h2>
      <p className="intro">Encuentra rutas hacia los lugares que visitas todos los días.</p>
      <div className="filters" role="group" aria-label="Filtrar destinos">
        {filters.map(({ id, label }) => (
          <button key={id} className="pill" type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">{visible.length} destinos</p>
      <ul className="dest-list">
        {visible.map((place) => (
          <li key={place.slug}>
            <Link className="dest" href={`/como-llegar/${place.slug}`}>
              <span className="home-row">
                <MapPin className="icon" aria-hidden="true" />
                <span>
                  <strong>{place.label}</strong>
                  <small>{place.routeCount} {place.routeCount === 1 ? "ruta" : "rutas"} cerca · Parada a {place.nearestWalkMin} min del destino</small>
                </span>
              </span>
              <ArrowUpRight className="icon" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link className="text-link" href="/como-llegar">Ver todos los destinos <ArrowRight className="icon" aria-hidden="true" /></Link>
    </section>
  );
}

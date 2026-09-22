import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import RutasFilter from "@/components/RutasFilter";
import { getRouteSeoItems } from "@/lib/route-seo";
import { getRouteSearchTerms } from "@/lib/route-names";
import { DATA_LAST_UPDATED, FARES_2026 } from "@/lib/mobility-config";

function buildSearchText(name: string, destination: string | null, landmarks: string[]): string {
  return [name, destination ?? "", ...landmarks, ...getRouteSearchTerms(name)]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export const metadata: Metadata = {
  // El número ("40") es un gancho de CTR y distingue esta página de la home,
  // que apunta al término amplio "rutas uruapan". El template añade "| UruGo".
  title: "Las 40 rutas de camiones en Uruapan",
  description: "El directorio completo de las 40 rutas de camión de Uruapan. Busca por colonia o destino, mira el recorrido de cada una y ábrela en el mapa. Gratis.",
  alternates: { canonical: "https://www.urugo.app/rutas" },
  openGraph: {
    title: "Las 40 rutas de camiones en Uruapan",
    description: "Busca por colonia o destino, mira el recorrido de cada ruta de camión de Uruapan y ábrela en el mapa interactivo.",
    url: "https://www.urugo.app/rutas",
    type: "website"
  }
};

export default function RutasPage() {
  const routes = getRouteSeoItems();
  const busRoutes = routes.filter((r) => !r.name.toLowerCase().includes("teleférico"));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.urugo.app/" },
          { "@type": "ListItem", position: 2, name: "Rutas", item: "https://www.urugo.app/rutas" }
        ]
      },
      {
        "@type": "ItemList",
        name: "Rutas de camión urbano en Uruapan",
        description: "Directorio de las 40 rutas de transporte público urbano en Uruapan, Michoacán.",
        numberOfItems: busRoutes.length,
        itemListElement: busRoutes.map((route, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: route.destination ? `${route.name} — ${route.destination}` : route.name,
          url: `https://www.urugo.app/ruta/${route.slug}`
        }))
      }
    ]
  };

  return (
    <main className="public-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader active="rutas" />

      <div className="px-5 pt-24 pb-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">

          <header>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--public-accent)]">Muévete por Uruapan</p>
            <h1 className="public-page-title mt-2 text-3xl sm:text-4xl">Directorio de rutas</h1>
            <p className="mt-2 text-sm text-[var(--public-secondary)]">Busca tu camión por número, colonia o destino.</p>
            <nav aria-label="Más opciones de transporte" className="mt-3 flex flex-wrap gap-x-5 text-sm font-bold text-[var(--public-accent)]">
              <Link href="/horarios" className="inline-flex min-h-11 items-center hover:underline">Horarios →</Link>
              <Link href="/como-llegar" className="inline-flex min-h-11 items-center hover:underline">Cómo llegar →</Link>
            </nav>
          </header>

          <div className="public-directory -mx-5 mt-3 px-5 py-4 sm:mx-0 sm:rounded-xl sm:px-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--public-secondary)]">
              <span className="font-bold text-[var(--public-ink)]">{busRoutes.length} rutas</span>
              <span aria-hidden="true">·</span>
              <span>{FARES_2026.urbanBus.price} por abordaje · Efectivo</span>
            </div>
            <RutasFilter total={busRoutes.length} />
            <ul id="rutas-grid" aria-label="Rutas de camión" className="grid gap-1.5 md:grid-cols-2">
              {busRoutes.map((route) => (
                <li
                  key={route.slug}
                  data-search={buildSearchText(route.name, route.destination, route.landmarks)}
                  className="flex min-w-0 items-center rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] transition-colors hover:border-[#6aab48]"
                >
                  <Link
                    href={`/ruta/${route.slug}`}
                    prefetch={false}
                    className="flex min-h-[76px] min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 hover:bg-[var(--public-hover)]"
                  >
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: route.color }} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-5">{route.name}</span>
                      {route.destination && <span className="mt-0.5 block text-xs leading-4 text-[var(--public-secondary)]">{route.destination}</span>}
                    </span>
                  </Link>
                  <Link
                    href={`/mapa?r=${encodeURIComponent(route.name)}`}
                    prefetch={false}
                    className="mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-bold text-[var(--public-accent)] transition-colors hover:bg-[var(--public-hover)]"
                    aria-label={`Ver ${route.name} en el mapa interactivo`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3ZM9 3v15m6-12v15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Mapa
                  </Link>
                </li>
              ))}
            </ul>

          {/* Estado vacío (lo controla RutasFilter) */}
          <div
            id="rutas-empty"
            style={{ display: "none", borderColor: "var(--public-border)", background: "var(--public-surface)" }}
            className="mt-4 flex flex-col items-center gap-2 rounded-lg border px-4 py-10 text-center"
          >
            <p className="text-sm font-semibold" style={{ color: "var(--public-ink)" }}>Sin resultados</p>
            <p className="text-xs" style={{ color: "var(--public-muted)" }}>Prueba con otro número, colonia o destino.</p>
          </div>

          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--public-muted)]">
            <Link href="/acerca-de" className="hover:underline">Rutas verificadas en campo · Actualizado {DATA_LAST_UPDATED}</Link>
          </p>

          {/* CTA teleférico */}
          <div
            className="mt-6 rounded-lg border p-4"
            style={{ borderColor: "rgba(0,212,170,0.2)", background: "rgba(0,212,170,0.04)" }}
          >
            <p className="text-xs font-bold uppercase" style={{ color: "#00D4AA" }}>
              También en Uruapan
            </p>
            <h2 className="mt-1 text-lg font-bold" style={{ color: "var(--public-ink)" }}>
              Teleférico Uruapan
            </h2>
            <p className="mt-2 text-sm leading-5" style={{ color: "var(--public-secondary)" }}>
              6 estaciones de oriente a poniente. Opera de 05:00 a 23:00. Tarifa {FARES_2026.teleferico.price} con tarjeta de movilidad.
            </p>
            <Link
              href="/teleferico-uruapan-horario"
              className="mt-3 inline-flex h-11 items-center rounded-md px-5 text-sm font-bold transition hover:opacity-90"
              style={{ background: "#00D4AA", color: "#0c110a" }}
            >
              Ver guía del Teleférico →
            </Link>
          </div>

        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

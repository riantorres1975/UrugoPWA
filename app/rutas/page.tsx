import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import RutasFilter from "@/components/RutasFilter";
import TransportRouteBadge from "@/components/TransportRouteBadge";
import { ArrowRight, Map } from "lucide-react";
import "@/app/transport.css";
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
    <main className="public-page transport-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader active="rutas" />

      <div className="transport-shell">
        <div>

          <header className="transport-heading">
            <div><p className="transport-eyebrow">Rutas de camión · Uruapan</p>
            <h1 className="public-page-title">Encuentra tu <em>ruta</em></h1>
            <p className="transport-lead">Busca por número o lugar. Abre su ficha para conocerla, o ve directo al mapa.</p></div>
            <nav aria-label="Más opciones de transporte" className="transport-shortcuts">
              <Link href="/horarios" className="transport-button">Consultar horarios</Link>
              <Link href="/mapa" className="transport-button transport-button-primary">Planear un viaje <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </nav>
          </header>

          <div className="transport-directory">
            <div className="transport-meta">
              <span><strong>{busRoutes.length} rutas</strong> para explorar</span>
              <span><strong>{FARES_2026.urbanBus.price}</strong> por camión · Efectivo</span>
            </div>
            <RutasFilter total={busRoutes.length} />
            <ul id="rutas-grid" aria-label="Rutas de camión" className="transport-route-grid">
              {busRoutes.map((route) => (
                <li
                  key={route.slug}
                  data-search={buildSearchText(route.name, route.destination, route.landmarks)}
                  data-route-name={route.name}
                  className="transport-route-card"
                >
                  <Link
                    href={`/ruta/${route.slug}`}
                    prefetch={false}
                    className="transport-route-link"
                  >
                    <TransportRouteBadge name={route.name} color={route.color} />
                    <span className="transport-route-copy">
                      <strong>{route.name}</strong>
                      {route.destination && <small>{route.destination}</small>}
                      <span className="block transport-route-action">Ver ficha <span aria-hidden="true">→</span></span>
                    </span>
                  </Link>
                  <Link
                    href={`/mapa?r=${encodeURIComponent(route.name)}`}
                    prefetch={false}
                    className="transport-map-link"
                    aria-label={`Ver ${route.name} en el mapa interactivo`}
                  >
                    <Map aria-hidden="true" />
                    Mapa
                  </Link>
                </li>
              ))}
            </ul>

          {/* Estado vacío (lo controla RutasFilter) */}
          <div
            id="rutas-empty"
            style={{ display: "none", borderColor: "var(--public-border)", background: "var(--public-surface)" }}
            className="transport-empty"
          >
            <p className="text-sm font-semibold" style={{ color: "var(--public-ink)" }}>Sin resultados</p>
            <p>Prueba otro número o lugar, o selecciona «Ver todas las rutas».</p>
          </div>

          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--public-muted)]">
            <Link href="/acerca-de" className="hover:underline">Rutas verificadas en campo · Actualizado {DATA_LAST_UPDATED}</Link>
          </p>

          {/* CTA teleférico */}
          <div
            className="mt-6 rounded-lg border p-4"
            style={{ borderColor: "var(--public-border)", background: "var(--public-tint)" }}
          >
            <p className="text-xs font-bold uppercase" style={{ color: "var(--public-teal)" }}>
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
              style={{ background: "var(--brand-lime)", color: "var(--brand-deep)" }}
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

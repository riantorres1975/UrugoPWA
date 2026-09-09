import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import RoutePreviewFromData from "@/components/RoutePreviewFromData";
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

      <div className="px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-3">
            <Link
              href="/"
              className="text-xs font-semibold uppercase transition hover:opacity-80"
              style={{ color: "var(--public-muted)" }}
            >
              ← Inicio
            </Link>
          </div>
          <p className="text-xs font-bold uppercase" style={{ color: "var(--public-accent)" }}>
            Uruapan, Michoacán
          </p>
          <h1
            className="mt-2 public-page-title"
            style={{ color: "var(--public-ink)", letterSpacing: "0" }}
          >
            Las <em style={{ fontStyle: "normal", color: "var(--public-accent)" }}>40 rutas</em> de camión en Uruapan
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
            Directorio completo de rutas de camión urbano. Toca cualquier ruta para ver destino, tarifa y abrirla en el mapa interactivo.
            {" "}
            <Link href="/horarios" className="font-bold transition hover:opacity-80" style={{ color: "var(--public-accent)" }}>
              Ver horarios de todas las rutas →
            </Link>
            {" "}
            <Link href="/como-llegar" className="font-bold transition hover:opacity-80" style={{ color: "var(--public-accent)" }}>
              ¿Cómo llegar a un lugar? →
            </Link>
          </p>

          <div className="public-directory -mx-5 mt-8 px-5 py-6 sm:mx-0 sm:px-6">
          {/* Stats bar */}
          <div
            className="flex flex-wrap gap-6 border-b border-[var(--public-border)] pb-5"
          >
            <div>
              <p className="text-xs font-bold uppercase" style={{ color: "var(--public-muted)" }}>Rutas</p>
              <p className="font-sans text-2xl font-bold" style={{ color: "var(--public-ink)" }}>40</p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(140,200,80,0.12)", paddingLeft: "1rem" }}>
              <p className="text-xs font-bold uppercase" style={{ color: "var(--public-muted)" }}>Tarifa</p>
              <p className="font-sans text-2xl font-bold" style={{ color: "var(--public-ink)" }}>
                <span className="font-sans">$</span>{FARES_2026.urbanBus.price.replace(/^\$/, "")}
              </p>
            </div>
            <div style={{ borderLeft: "1px solid rgba(140,200,80,0.12)", paddingLeft: "1rem" }}>
              <p className="text-xs font-bold uppercase" style={{ color: "var(--public-muted)" }}>Pago</p>
              <p className="font-sans text-2xl font-bold" style={{ color: "var(--public-ink)" }}>Efectivo</p>
            </div>
            <div className="flex w-full items-center gap-1.5 pt-1 sm:ml-auto sm:w-auto sm:pt-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--public-accent)" }} aria-hidden="true">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <Link href="/acerca-de" className="text-[11px] font-semibold transition hover:text-[var(--public-ink)]" style={{ color: "var(--public-secondary)" }}>
                Rutas verificadas en campo · actualizado {DATA_LAST_UPDATED}
              </Link>
            </div>
          </div>

          {/* Buscador (filtra las tarjetas sin recargar) */}
          <div className="mt-8">
            <RutasFilter total={busRoutes.length} />
          </div>

          {/* Grid de rutas */}
          <div id="rutas-grid" className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {busRoutes.map((route) => (
              <div
                key={route.slug}
                data-search={buildSearchText(route.name, route.destination, route.landmarks)}
                className="flex flex-col rounded-lg border transition-colors hover:border-[#6aab48]"
                style={{
                  borderColor: "var(--public-border)",
                  background: "var(--public-surface)",
                  // No renderizar tarjetas fuera de pantalla hasta que se acerquen al scroll
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 140px",
                }}
              >
                {/* prefetch={false}: con 40 tarjetas × 3 enlaces, el prefetch
                    automático dispara decenas de fetches al abrir y al hacer
                    scroll; la navegación bajo demanda es imperceptible. */}
                <Link
                  href={`/ruta/${route.slug}`}
                  prefetch={false}
                  className="group flex flex-1 items-center gap-3 p-3 transition active:scale-[0.99] sm:items-start sm:p-4"
                >
                  <div className="min-w-0 flex-1 order-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="font-sans text-base font-bold" style={{ color: "var(--public-ink)" }}>
                        {route.name}
                      </span>
                    </div>
                    {route.destination && (
                      <p className="mt-1.5 text-xs leading-snug" style={{ color: "var(--public-muted)" }}>
                        → {route.destination}
                      </p>
                    )}
                  </div>
                  <div
                    className="order-2 shrink-0 overflow-hidden"
                  >
                    <RoutePreviewFromData
                      routeName={route.name}
                      color={route.color}
                      width={84}
                      height={56}
                      strokeWidth={2}
                    />
                  </div>
                </Link>
                <div
                  className="flex items-center justify-between gap-2 border-t px-3 py-2 sm:px-4"
                  style={{ borderColor: "var(--public-border)" }}
                >
                  <Link
                    href={`/ruta/${route.slug}`}
                    prefetch={false}
                    className="inline-flex h-8 items-center gap-1 text-[11px] font-semibold uppercase transition hover:opacity-80"
                    style={{ color: "var(--public-ink)" }}
                  >
                    Detalles →
                  </Link>
                  <Link
                    href={`/mapa?r=${encodeURIComponent(route.name)}`}
                    prefetch={false}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold transition hover:opacity-90"
                    style={{ background: "var(--public-surface)", color: "var(--public-accent)" }}
                    aria-label={`Ver ${route.name} en el mapa interactivo`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
                    </svg>
                    Ver en mapa
                  </Link>
                </div>
              </div>
            ))}
          </div>

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

          {/* CTA teleférico */}
          <div
            className="mt-10 rounded-lg border p-6"
            style={{ borderColor: "rgba(0,212,170,0.2)", background: "rgba(0,212,170,0.04)" }}
          >
            <p className="text-xs font-bold uppercase" style={{ color: "#00D4AA" }}>
              También en Uruapan
            </p>
            <h2 className="mt-2 public-section-title" style={{ color: "var(--public-ink)" }}>
              Teleférico Uruapan
            </h2>
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
              6 estaciones de oriente a poniente. Opera de 05:00 a 23:00. Tarifa {FARES_2026.teleferico.price} con tarjeta de movilidad.
            </p>
            <Link
              href="/teleferico-uruapan-horario"
              className="mt-4 inline-flex h-10 items-center rounded-md px-5 text-sm font-bold transition hover:opacity-90"
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

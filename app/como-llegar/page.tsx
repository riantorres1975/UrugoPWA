import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PlaceDirectory from "@/components/PlaceDirectory";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { getPlaceSeoItems, getRoutesNearPlace } from "@/lib/como-llegar";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Cómo llegar en camión a los lugares de Uruapan",
  description:
    "Guías para llegar en transporte público a los lugares más visitados de Uruapan: hospitales, centro, central de autobuses, plazas y más. Rutas, distancias a pie y mapa.",
  alternates: { canonical: `${SITE_URL}/como-llegar` },
  openGraph: {
    title: "Cómo llegar en camión a los lugares de Uruapan",
    description: "Qué rutas de camión te dejan en cada lugar importante de Uruapan.",
    url: `${SITE_URL}/como-llegar`,
    type: "website"
  }
};

export default function ComoLlegarIndexPage() {
  const places = getPlaceSeoItems().map((place) => {
    const label = place.label.toLowerCase();
    const category = /hospital|imss|clínica|clinica|salud/.test(label)
      ? "Salud"
      : /universidad|unid|escuela|esfu|tecnol|colegio|facultad/.test(label)
        ? "Educación"
        : /mercado|plaza|coppel|aurrera|comercial|tienda/.test(label)
          ? "Compras"
          : /presidencia|ine|gobierno|trámites|tramites/.test(label)
            ? "Gobierno"
            : /parque|unidad deportiva|estadio|centro histórico|centro historico/.test(label)
              ? "Recreación"
              : "Todos";
    return { slug: place.slug, label: place.label, routeCount: getRoutesNearPlace(place.center).length, category };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Cómo llegar", item: `${SITE_URL}/como-llegar` }
        ]
      },
      {
        "@type": "ItemList",
        name: "Cómo llegar en camión a lugares de Uruapan",
        numberOfItems: places.length,
        itemListElement: places.map((place, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: place.label,
          url: `${SITE_URL}/como-llegar/${place.slug}`
        }))
      }
    ]
  };

  return (
    <main className="public-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader active="como-llegar" />

      <div className="px-5 pt-28 pb-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl min-w-0">
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
            ¿Cómo <em style={{ fontStyle: "normal", color: "var(--public-accent)" }}>llegar</em> en camión?
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
            Elige a dónde vas y te decimos qué rutas de camión te dejan ahí, a cuántos minutos
            caminando y cómo planear el viaje desde tu ubicación.
          </p>

          <PlaceDirectory places={places} />

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/mapa"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
            >
              Abrir el mapa interactivo
            </Link>
            <Link
              href="/horarios"
              className="inline-flex h-12 items-center justify-center rounded-md border px-6 text-sm font-bold transition"
              style={{
                borderColor: "var(--public-border)",
                background: "var(--public-surface)",
                color: "var(--public-ink)",
              }}
            >
              Ver horarios de rutas
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

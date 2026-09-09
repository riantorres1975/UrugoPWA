import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { findPlaceSeoItem, getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { DATA_LAST_UPDATED, FARES_2026 } from "@/lib/mobility-config";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";

type PlacePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPlaceSeoItems().map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = findPlaceSeoItem(slug);
  if (!place) return {};

  const isCentro = place.slug === "centro";
  const title = isCentro
    ? "Cómo llegar al Centro de Uruapan: rutas y mapa"
    : `Cómo llegar a ${place.label} en camión — Uruapan`;
  const description = isCentro
    ? "Descubre qué rutas de camión pasan cerca del Centro de Uruapan, a cuántos minutos te dejan y cómo llegar desde tu ubicación en el mapa de UruGo."
    : `Cómo llegar a ${place.label} en Uruapan: rutas de camión cercanas, distancia a pie, tarifa de ${FARES_2026.urbanBus.price} y mapa desde tu ubicación.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/como-llegar/${place.slug}` },
    openGraph: {
      title: isCentro ? "Cómo llegar al Centro de Uruapan" : `Cómo llegar a ${place.label} en camión`,
      description: isCentro
        ? "Rutas de camión para llegar al Centro de Uruapan, distancia a pie y mapa desde tu ubicación."
        : `Qué rutas de transporte público te dejan en ${place.label}, Uruapan, y a cuántos minutos caminando.`,
      url: `${SITE_URL}/como-llegar/${place.slug}`,
      type: "article"
    }
  };
}

export default async function ComoLlegarPage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = findPlaceSeoItem(slug);
  if (!place) notFound();

  const routes = getRoutesNearPlace(place.center);
  const [lng, lat] = place.center;
  const mapHref = `/mapa?b=${lng.toFixed(6)},${lat.toFixed(6)}&destino=${encodeURIComponent(place.label)}`;

  const faqs = [
    {
      question: `¿Qué rutas de camión pasan por ${place.label}?`,
      answer:
        routes.length > 0
          ? `Las rutas que te dejan a menos de 500 m de ${place.label} son: ${routes.map((r) => r.name).join(", ")}. La más cercana pasa a ~${routes[0].distanceM} m (${walkMinutesFor(routes[0].distanceM)} min caminando).`
          : `Ninguna ruta urbana pasa a menos de 500 m de ${place.label}. Usa el mapa de UruGo para encontrar la combinación con transbordo más corta.`
    },
    {
      question: `¿Cuánto cuesta llegar a ${place.label} en camión?`,
      answer: `La tarifa del camión urbano en Uruapan es de ${FARES_2026.urbanBus.price} por viaje, pagadera en efectivo al abordar. Si necesitas transbordo, pagas un pasaje por cada camión.`
    },
    {
      question: `¿Dónde me bajo para ir a ${place.label}?`,
      answer: `Los camiones en Uruapan paran casi en cualquier esquina del recorrido. Avisa al chofer o toca el timbre cuando te acerques a ${place.label}. En el mapa de UruGo puedes ver el punto exacto del recorrido más cercano.`
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Cómo llegar", item: `${SITE_URL}/como-llegar` },
          { "@type": "ListItem", position: 3, name: place.label, item: `${SITE_URL}/como-llegar/${place.slug}` }
        ]
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer }
        }))
      }
    ]
  };

  return (
    <main className="public-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PublicHeader active="como-llegar" mapHref={mapHref} />

      <div className="px-5 pt-28 pb-28 sm:px-8 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3">
            <Link
              href="/como-llegar"
              className="text-xs font-semibold uppercase transition hover:opacity-80"
              style={{ color: "var(--public-muted)" }}
            >
              ← Todos los lugares
            </Link>
          </div>
          <p className="text-xs font-bold uppercase" style={{ color: "var(--public-accent)" }}>
            Cómo llegar en camión · Uruapan
          </p>
          <h1
            className="mt-2 public-page-title"
            style={{ color: "var(--public-ink)", letterSpacing: "0" }}
          >
            {place.slug === "centro" ? "Cómo llegar al Centro de Uruapan" : place.label}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
            {routes.length > 0
              ? `${routes.length} ruta${routes.length === 1 ? "" : "s"} de camión te ${routes.length === 1 ? "deja" : "dejan"} cerca de ${place.label}. Tarifa ${FARES_2026.urbanBus.price} en efectivo.`
              : `Ninguna ruta pasa directamente por ${place.label}; usa el mapa para planear un viaje con transbordo.`}
          </p>
          <Link href="/acerca-de" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold transition hover:text-[var(--public-ink)]" style={{ color: "var(--public-secondary)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--public-accent)" }} aria-hidden="true">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            Recorridos verificados en campo · actualizado {DATA_LAST_UPDATED}
          </Link>

          {/* Rutas cercanas */}
          {routes.length > 0 && (
            <div className="mt-8 flex flex-col gap-2.5">
              {routes.map((route) => {
                const schedule = getSchedule(route.name);
                return (
                  <div
                    key={route.name}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                    style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: route.color }} />
                      <div className="min-w-0">
                        <p className="font-sans text-base font-bold" style={{ color: "var(--public-ink)" }}>
                          {route.name}
                          {route.destination && (
                            <span className="ml-2 text-xs font-normal" style={{ color: "var(--public-muted)" }}>
                              → {route.destination}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-[12px]" style={{ color: "var(--public-secondary)" }}>
                          Te deja a ~{route.distanceM} m ({walkMinutesFor(route.distanceM)} min caminando)
                          {schedule && ` · ${schedule.first}–${schedule.last}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {route.routeSlug && (
                        <Link
                          href={`/ruta/${route.routeSlug}`}
                          prefetch={false}
                          className="inline-flex h-9 items-center rounded-md border px-4 text-xs font-bold transition hover:opacity-80"
                          style={{ borderColor: "var(--public-border)", color: "var(--public-ink)" }}
                        >
                          Detalles
                        </Link>
                      )}
                      <Link
                        href={`/mapa?r=${encodeURIComponent(route.name)}`}
                        prefetch={false}
                        className="inline-flex h-9 items-center gap-1 rounded-md px-4 text-xs font-bold transition hover:opacity-90"
                        style={{ background: "var(--public-surface)", color: "var(--public-accent)" }}
                      >
                        Ver en mapa
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA principal */}
          <div
            className="mt-8 rounded-lg border p-5"
            style={{ borderColor: "rgba(184,232,64,0.2)", background: "rgba(184,232,64,0.06)" }}
          >
            <h2 className="public-section-title" style={{ color: "var(--public-ink)" }}>
              Planea tu viaje exacto
            </h2>
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
              Abre el mapa con {place.label} como destino: marca tu origen (o usa tu ubicación) y UruGo
              te dirá qué ruta tomar, dónde subir, dónde bajar y si necesitas transbordo.
            </p>
            <Link
              href={mapHref}
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#b8e840] px-6 py-2 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
            >
              Cómo llegar desde mi ubicación →
            </Link>
          </div>

          {/* FAQs */}
          <section className="mt-10">
            <h2 className="mb-5 public-section-title" style={{ color: "var(--public-ink)" }}>
              Preguntas frecuentes
            </h2>
            <div className="flex flex-col gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-lg border p-5"
                  style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                >
                  <h3 className="text-sm font-bold mb-2" style={{ color: "var(--public-accent)" }}>{faq.question}</h3>
                  <p className="text-sm leading-6" style={{ color: "var(--public-secondary)" }}>{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <PublicFooter />

      {/* CTA fijo inferior en móvil */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          borderColor: "var(--public-border)",
          background: "var(--public-bg)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href={mapHref}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b8e840] px-3 py-2 text-center text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.2" fill="currentColor" />
          </svg>
          Cómo llegar a {place.label}
        </Link>
      </div>
    </main>
  );
}

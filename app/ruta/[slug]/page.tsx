import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import RoutePreviewFromData from "@/components/RoutePreviewFromData";
import RouteVerification from "@/components/RouteVerification";
import { FARES_2026, SITE_CONTENT_LAST_UPDATED_ISO } from "@/lib/mobility-config";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";
import { buildRouteStaticMapUrl } from "@/lib/static-map";

type RoutePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  // El teleférico no es ruta de camión: /ruta/teleferico-uruapan redirige a su
  // guía dedicada (ver next.config.mjs), así que no se construye con esta plantilla.
  return getRouteSeoItems()
    .filter((route) => route.slug !== "teleferico-uruapan")
    .map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: RoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = findRouteSeoItem(slug);

  if (!route) {
    return {};
  }

  const label = route.destination ? `${route.name} a ${route.destination}` : route.name;
  const kmText = route.distanceKm > 0 ? `, recorrido de ${route.distanceKm} km` : "";
  const lmText = route.landmarks.length > 0 ? `, pasa por ${route.landmarks.slice(0, 2).join(" y ")}` : "";
  const schedule = getSchedule(route.name);
  const scheduleText = schedule ? `, horario ${schedule.first} a ${schedule.last}` : "";

  return {
    title: `${route.name} Uruapan: por dónde pasa y horario`,
    description: `Consulta por dónde pasa la ${route.name} en Uruapan${kmText}${scheduleText}. Tarifa ${FARES_2026.urbanBus.price} y mapa con puntos de referencia.`,
    alternates: {
      canonical: `${SITE_URL}/ruta/${route.slug}`
    },
    openGraph: {
      title: `${label}: recorrido y horario en Uruapan`,
      description: `Consulta por dónde pasa la ${route.name}${lmText}${kmText}, su tarifa y el recorrido en el mapa.`,
      url: `${SITE_URL}/ruta/${route.slug}`,
      type: "article"
    }
  };
}

export default async function RoutePage({ params }: RoutePageProps) {
  const { slug } = await params;
  const route = findRouteSeoItem(slug);

  if (!route) {
    notFound();
  }

  const title = route.destination ? `${route.name}: ${route.destination}` : route.name;
  const directions = route.hasIda && route.hasVuelta ? "Ida y vuelta" : route.hasIda ? "Solo ida" : "Solo vuelta";
  const staticMapUrl = buildRouteStaticMapUrl(route.name, route.color);
  const compactDesktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 640, 560);
  const desktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 900, 560);
  const estimatedMinutes = route.distanceKm > 0 ? Math.round((route.distanceKm / 18) * 60) : null;
  const schedule = getSchedule(route.name);
  const frequencyLabel = schedule
    ? schedule.continuous
      ? "Servicio continuo"
      : schedule.freqMin === schedule.freqMax
        ? `Cada ${schedule.freqMin} min`
        : `Cada ${schedule.freqMin}–${schedule.freqMax} min`
    : null;

  const faqs = [
    {
      question: `¿Cuánto cuesta la ${route.name}?`,
      answer: `La tarifa base de la ${route.name} es de ${FARES_2026.urbanBus.price} por viaje, pagadera al abordar.`
    },
    {
      question: `¿Por dónde pasa la ${route.name} en Uruapan?`,
      answer: route.destination
        ? `La ${route.name} conecta distintos puntos de Uruapan con ${route.destination}${route.landmarks.length > 0 ? ` y pasa cerca de ${route.landmarks.slice(0, 4).join(", ")}` : ""}. Consulta el mapa para seguir el recorrido exacto.`
        : `La ${route.name} recorre colonias y zonas de Uruapan${route.landmarks.length > 0 ? ` y pasa cerca de ${route.landmarks.slice(0, 4).join(", ")}` : ""}. Consulta el mapa para seguir el recorrido exacto.`
    },
    {
      question: `¿Cuánto tiempo tarda la ${route.name}?`,
      answer: estimatedMinutes
        ? `El recorrido completo de la ${route.name} es de aproximadamente ${route.distanceKm} km, lo que equivale a unos ${estimatedMinutes} minutos de viaje en condiciones normales de tráfico.`
        : `El tiempo varía según el tráfico y la hora del día. Usa el mapa interactivo de UruGo para estimar el tiempo desde tu punto de origen.`
    },
    ...(schedule
      ? [
          {
            question: `¿Cuál es el horario de la ${route.name}?`,
            answer: schedule.continuous
              ? `La ${route.name} opera en servicio continuo de ${schedule.first} a ${schedule.last} horas.`
              : `La ${route.name} opera aproximadamente de ${schedule.first} a ${schedule.last} horas, con unidades ${frequencyLabel?.toLowerCase()}. Los horarios pueden variar según el día y el tráfico.`
          }
        ]
      : []),
    {
      question: `¿Dónde paro la ${route.name}?`,
      answer: `Los camiones urbanos en Uruapan no tienen paradas fijas: paran casi en cualquier esquina del recorrido. Colócate sobre la calle por donde pasa la ${route.name} y haz la parada con la mano. Para bajar, avisa al chofer o toca el timbre.`
    },
    {
      question: `¿Cómo saber si la ${route.name} pasa cerca de mi destino?`,
      answer: `Abre el mapa de UruGo, marca tu origen y destino, y el sistema calculará si la ${route.name} u otra ruta es la mejor opción, incluyendo caminatas y transbordos.`
    }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Rutas", item: `${SITE_URL}/rutas` },
          { "@type": "ListItem", position: 3, name: route.name, item: `${SITE_URL}/ruta/${route.slug}` }
        ]
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/ruta/${route.slug}#page`,
        name: `${route.name} Uruapan: por dónde pasa y horario`,
        url: `${SITE_URL}/ruta/${route.slug}`,
        inLanguage: "es-MX",
        dateModified: SITE_CONTENT_LAST_UPDATED_ISO,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#organization` },
        about: { "@id": `${SITE_URL}/ruta/${route.slug}#trip` }
      },
      {
        "@type": "BusTrip",
        "@id": `${SITE_URL}/ruta/${route.slug}#trip`,
        name: `${route.name} Uruapan`,
        description: `Ruta de camión urbano en Uruapan${route.destination ? ` hacia ${route.destination}` : ""}${route.distanceKm > 0 ? `. Recorrido de ${route.distanceKm} km` : ""}.`,
        offers: {
          "@type": "Offer",
          price: FARES_2026.urbanBus.price.replace(/[^0-9.]/g, ""),
          priceCurrency: "MXN"
        }
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer
          }
        }))
      }
    ]
  };

  return (
    <main className="public-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <PublicHeader active="rutas" mapHref={`/mapa?r=${encodeURIComponent(route.name)}`} />

      <div className="px-5 pb-28 pt-28 sm:px-8 lg:px-10 lg:pb-16 lg:pt-32">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="mx-auto max-w-7xl">
          <div className="mb-5">
            <Link
              href="/rutas"
              className="text-xs font-semibold uppercase transition hover:opacity-80"
              style={{ color: "var(--public-muted)" }}
            >
              ← Todas las rutas
            </Link>
          </div>
          <article className="overflow-hidden border-y border-[var(--public-border)]">
            <div className="h-2" style={{ backgroundColor: route.color }} />

            <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,0.85fr)]">
              {/* Route map preview */}
              <div
                className="w-full overflow-hidden lg:min-h-[440px]"
                style={{
                  borderBottom: "1px solid rgba(140,200,80,0.08)",
                  background: "rgba(0,0,0,0.3)",
                  lineHeight: 0,
                }}
              >
                {staticMapUrl ? (
                  <picture>
                    {desktopStaticMapUrl && <source media="(min-width: 1280px)" srcSet={desktopStaticMapUrl} />}
                    {compactDesktopStaticMapUrl && <source media="(min-width: 1024px)" srcSet={compactDesktopStaticMapUrl} />}
                    <img
                      src={staticMapUrl}
                      alt={`Mapa del recorrido de la ${route.name} en Uruapan`}
                      width={800}
                      height={220}
                      className="block h-auto w-full lg:h-full lg:min-h-[440px] lg:object-contain"
                    />
                  </picture>
                ) : (
                  <div className="flex h-full min-h-[180px] items-center lg:min-h-[440px]">
                    <RoutePreviewFromData
                      routeName={route.name}
                      color={route.color}
                      width={800}
                      height={560}
                      strokeWidth={3}
                      className="h-auto w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10 xl:p-12">
                <p className="text-xs font-bold uppercase" style={{ color: "var(--public-accent)" }}>
                  Ruta de camión · Uruapan
                </p>
                <h1
                  className="mt-3 public-page-title"
                  style={{ color: "var(--public-ink)" }}
                >
                  {title}
                </h1>
                <p className="mt-5 text-sm leading-7 lg:text-base" style={{ color: "var(--public-secondary)" }}>
                  {route.destination
                    ? `La ${route.name} conecta distintas zonas de Uruapan con ${route.destination}${route.distanceKm > 0 ? `, con un recorrido total de ${route.distanceKm} km` : ""}. Consulta el mapa para ver paradas y transbordos disponibles.`
                    : `La ${route.name} recorre colonias de Uruapan${route.distanceKm > 0 ? ` en un trayecto de ${route.distanceKm} km` : ""}. Usa el mapa para encontrar la parada más cercana a tu origen y destino.`
                  }
                </p>
                <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
                  <Link
                    href={`/mapa?r=${encodeURIComponent(route.name)}`}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
                    </svg>
                    Ver esta ruta
                  </Link>
                  <Link
                    href="/horarios"
                    className="inline-flex h-12 items-center justify-center rounded-md border px-6 text-sm font-bold transition hover:bg-white/5"
                    style={{ borderColor: "var(--public-border)", color: "var(--public-ink)" }}
                  >
                    Consultar horarios
                  </Link>
                </div>
              </div>
            </div>

            <dl
              className="grid grid-cols-2 gap-2.5 border-t p-6 sm:grid-cols-3 sm:gap-3 md:p-8 lg:grid-cols-6 lg:gap-0 lg:p-0 lg:[&>div]:rounded-none lg:[&>div]:border-y-0 lg:[&>div]:border-l-0 lg:[&>div]:bg-transparent lg:[&>div]:px-6 lg:[&>div]:py-5 lg:[&>div:last-child]:border-r-0"
              style={{ borderColor: "var(--public-border)" }}
            >
                <div
                  className="rounded-lg border p-4 lg:border-r"
                  style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                >
                  <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Destino</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{route.destination ?? "Ruta local"}</dd>
                </div>
                <div
                  className="rounded-lg border p-4 lg:border-r"
                  style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                >
                  <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Tarifa</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{FARES_2026.urbanBus.price}</dd>
                </div>
                {route.distanceKm > 0 && (
                  <div
                    className="rounded-lg border p-4 lg:border-r"
                    style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                  >
                    <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Recorrido</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{route.distanceKm} km</dd>
                  </div>
                )}
                <div
                  className="rounded-lg border p-4 lg:border-r"
                  style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                >
                  <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Sentido</dt>
                  <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{directions}</dd>
                </div>
                {schedule && (
                  <div
                    className="rounded-lg border p-4 lg:border-r"
                    style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                  >
                    <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Horario</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{schedule.first} – {schedule.last}</dd>
                  </div>
                )}
                {frequencyLabel && (
                  <div
                    className="rounded-lg border p-4 lg:border-r"
                    style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                  >
                    <dt className="text-xs font-bold uppercase" style={{ color: "var(--public-secondary)" }}>Frecuencia</dt>
                    <dd className="mt-2 text-sm font-bold" style={{ color: "var(--public-ink)" }}>{frequencyLabel}</dd>
                  </div>
                )}
            </dl>

            <div className="p-6 md:p-8 lg:p-10 xl:p-12">
              <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:gap-12">

              {route.landmarks.length > 0 && (
                <section>
                  <h2 className="mb-4 public-section-title" style={{ color: "var(--public-ink)" }}>
                    ¿Por dónde pasa la {route.name}?
                  </h2>
                  <p className="mb-5 text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
                    {route.destination
                      ? `El recorrido hacia ${route.destination} pasa cerca de estos puntos de referencia en Uruapan.`
                      : "Estos son algunos puntos de referencia ubicados cerca del recorrido en Uruapan."}
                    {schedule && ` Su horario aproximado es de ${schedule.first} a ${schedule.last}.`}
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:gap-3">
                    {route.landmarks.map((lm) => (
                      <li
                        key={lm}
                        className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm lg:rounded-lg"
                        style={{ borderColor: "var(--public-border)", background: "var(--public-surface)", color: "var(--public-ink)" }}
                      >
                        <span style={{ color: "var(--public-muted)" }}>▸</span> {lm}
                      </li>
                    ))}
                  </ul>
                  {route.name !== "Ruta 1 - San José" && (
                    <p className="mt-3 text-[11px]" style={{ color: "var(--public-muted)" }}>
                      Referencias con datos de{" "}
                      <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 transition hover:opacity-80"
                      >
                        OpenStreetMap contributors
                      </a>
                      . Verifica el punto exacto antes de viajar.
                    </p>
                  )}
                </section>
              )}

              <section
                className="mt-8 rounded-lg border bg-[rgba(184,232,64,0.06)] p-5 lg:mt-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:bg-transparent lg:pl-10"
                style={{ borderColor: "rgba(184,232,64,0.2)" }}
              >
                <h2 className="public-section-title" style={{ color: "var(--public-ink)" }}>Cómo planear tu viaje</h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--public-secondary)" }}>
                  Abre el mapa de UruGo y marca tu punto de origen y tu destino. El sistema calcula si la {route.name} cubre tu trayecto, qué tan lejos están las paradas y si necesitas caminar o hacer transbordo con otra ruta o el Teleférico de Uruapan.
                  {estimatedMinutes && ` El recorrido completo toma aproximadamente ${estimatedMinutes} minutos.`}
                </p>
                <Link href="/acerca-de" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold transition hover:text-[var(--public-ink)]" style={{ color: "var(--public-secondary)" }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--public-accent)" }} aria-hidden="true">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  Recorrido verificado en campo · conoce la metodología
                </Link>
              </section>
              </div>

              <RouteVerification routeKey={route.slug} routeName={route.name} />

              <section className="mt-10 border-t pt-9" style={{ borderColor: "var(--public-border)" }}>
                <h2 className="mb-5 public-section-title" style={{ color: "var(--public-ink)" }}>
                  Preguntas frecuentes
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="rounded-lg border p-5 lg:rounded-lg"
                      style={{ borderColor: "var(--public-border)", background: "var(--public-surface)" }}
                    >
                      <h3 className="text-sm font-bold mb-2" style={{ color: "var(--public-accent)" }}>{faq.question}</h3>
                      <p className="text-sm leading-6" style={{ color: "var(--public-secondary)" }}>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="mt-10 flex flex-col gap-3 border-t pt-8 sm:flex-row lg:justify-end" style={{ borderColor: "var(--public-border)" }}>
                <Link
                  href={`/mapa?r=${encodeURIComponent(route.name)}`}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
                >
                  Ver en el mapa
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
                  Horarios de todas las rutas
                </Link>
                <Link
                  href="/rutas"
                  className="inline-flex h-12 items-center justify-center rounded-md border px-6 text-sm font-bold transition"
                  style={{
                    borderColor: "var(--public-border)",
                    background: "var(--public-surface)",
                    color: "var(--public-ink)",
                  }}
                >
                  Ver todas las rutas
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>

      <PublicFooter />

      {/* CTA fijo inferior — acceso rápido al mapa en móvil/tablet */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 backdrop-blur-xl lg:hidden"
        style={{
          borderColor: "var(--public-border)",
          background: "var(--public-bg)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <Link
          href={`/mapa?r=${encodeURIComponent(route.name)}`}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b8e840] px-3 py-2 text-center text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.2" fill="currentColor" />
          </svg>
          Ver {route.name} en el mapa
        </Link>
      </div>
    </main>
  );
}

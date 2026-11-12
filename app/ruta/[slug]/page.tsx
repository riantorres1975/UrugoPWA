import type { Metadata } from "next";
import Link from "next/link";
import { Maximize2, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import RoutePreviewFromData from "@/components/RoutePreviewFromData";
import RouteConsultationTracker from "@/components/RouteConsultationTracker";
import RouteVerification from "@/components/RouteVerification";
import { FARES_2026, SITE_CONTENT_LAST_UPDATED_ISO } from "@/lib/mobility-config";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";
import { buildRouteStaticMapUrl } from "@/lib/static-map";
import RouteMapPreview from "@/components/RouteMapPreview";
import TransportRouteBadge from "@/components/TransportRouteBadge";
import RouteMobileAction from "@/components/RouteMobileAction";
import "@/app/transport.css";

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

  const directions = route.hasIda && route.hasVuelta ? "Ida y vuelta" : route.hasIda ? "Solo ida" : "Solo vuelta";
  const staticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 400, 250, { padding: 30 });
  const tabletStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 800, 500);
  const compactDesktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 640, 560);
  const desktopStaticMapUrl = buildRouteStaticMapUrl(route.name, route.color, 900, 560);
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
      answer: `El tiempo depende de dónde subas, dónde bajes y del tráfico. ${route.distanceKm > 0 ? `El trazado registrado suma ${route.distanceKm} km${route.hasIda && route.hasVuelta ? " entre ida y vuelta" : ""}; no representa la distancia de todos los viajes. ` : ""}Marca tu origen y destino en el mapa para estimar tu trayecto.`
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

  const mapHref = "/mapa?r=" + encodeURIComponent(route.name);
  const scheduleHref = "/horarios?buscar=" + encodeURIComponent(route.name);
  return (
    <main className="public-page transport-page transport-route-detail min-h-dvh">
      <RouteConsultationTracker routeKey={route.slug} />
      <PublicHeader active="rutas" mapHref={mapHref} />
      <div className="transport-shell">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Link href="/rutas" className="route-breadcrumb">← Todas las rutas</Link>
        <article>
          <div className="route-overview">
            <div className="route-overview-copy">
              <div className="route-overview-identity"><TransportRouteBadge name={route.name} color={route.color} />
              <p className="transport-eyebrow">Ruta de camión · Uruapan</p></div>
              <h1 className="public-page-title">{route.name}</h1>
              <p className="transport-lead">{route.destination || "Consulta las referencias y abre el mapa para saber si pasa cerca de tu destino."}</p>
              <div className="route-overview-actions">
                <Link id="route-map-action" href={mapHref} className="transport-button transport-button-primary">Ver recorrido en mapa <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link href={scheduleHref} className="transport-button">Consultar horarios</Link>
              </div>
              <dl className="route-facts" aria-label="Información de la ruta">
                <div><dt>Tarifa por camión</dt><dd>{FARES_2026.urbanBus.price}<small>Pago en efectivo</small></dd></div>
                {schedule && <div><dt>Horario aproximado</dt><dd>{schedule.first} – {schedule.last}<small>Primer / último servicio</small></dd></div>}
                {frequencyLabel && <div><dt>Frecuencia aproximada</dt><dd>{frequencyLabel}</dd></div>}
                <div><dt>Sentidos disponibles</dt><dd>{directions}</dd></div>
              </dl>
            </div>
            <div className="route-map-preview">
              <RouteMapPreview key={route.slug} image={staticMapUrl} name={route.name} sources={[
                { media: "(min-width: 1280px)", url: desktopStaticMapUrl },
                { media: "(min-width: 901px)", url: compactDesktopStaticMapUrl },
                { media: "(min-width: 640px)", url: tabletStaticMapUrl },
              ]}>
                <RoutePreviewFromData routeName={route.name} color={route.color} width={640} height={400} strokeWidth={4} className="h-auto w-full" />
              </RouteMapPreview>
              <div className="route-map-caption"><span>{route.distanceKm > 0 ? route.distanceKm + " km de trazado registrado" : "Vista general del recorrido"}</span>
                <Link href={mapHref} className="inline-flex min-h-11 items-center gap-2"><Maximize2 className="h-4 w-4" aria-hidden="true" /> Abrir mapa interactivo</Link>
              </div>
            </div>
          </div>
          <div className="route-sections">
            <section className="route-section">
              <h2>¿Por dónde pasa?</h2>
              <p>Estas referencias están cerca del recorrido. Consulta el mapa para elegir dónde subir y bajar; la lista no representa paradas fijas ni su orden.</p>
              {route.landmarks.length > 0 ? <ul className="route-landmarks" aria-label="Referencias cercanas a la ruta">
                {route.landmarks.map((landmark) => <li key={landmark}>{landmark}</li>)}
              </ul> : <p>Aún no tenemos referencias suficientes. Puedes revisar el trazado completo en el mapa.</p>}
              {route.name !== "Ruta 1 - San José" && <p className="text-xs">Referencias con datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>. Verifica el acceso antes de viajar.</p>}
            </section>
            <aside className="route-section" aria-label="Ayuda para viajar">
              <h2>¿Te lleva a tu destino?</h2>
              <ol className="route-steps">
                <li>Abre el mapa y marca de dónde sales.</li>
                <li>Elige tu destino para comparar rutas y caminatas.</li>
                <li>Revisa dónde subir, bajar y hacer transbordo si lo necesitas.</li>
              </ol>
              <Link href={mapHref} className="transport-button mt-5">Planear mi viaje →</Link>
              <p>Los horarios son aproximados y pueden variar por tráfico. Confirma con el conductor antes de subir.</p>
              <Link href="/acerca-de" className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-[var(--public-accent)] underline">Cómo verificamos la información</Link>
            </aside>
          </div>
          <RouteVerification routeKey={route.slug} routeName={route.name} />
          <section className="transport-faq" aria-label="Preguntas frecuentes de la ruta">
            <h2>Antes de viajar</h2>
            <div className="transport-faq-list">
              {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
            </div>
          </section>
          <div className="transport-help">
            <div><h2>¿Hay algún dato incorrecto?</h2><p>Avísanos si cambió el recorrido, el horario o alguna referencia de esta ruta.</p></div>
            <Link href={"/reportar-error?ruta=" + encodeURIComponent(route.name) + "&clave=" + route.slug} className="transport-button">Reportar un problema</Link>
          </div>
        </article>
      </div>
      <PublicFooter />
      <RouteMobileAction key={route.slug} href={mapHref} name={route.name} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import ScheduleDirectory, { type ScheduleService } from "@/components/ScheduleDirectory";
import SchoolDepartures from "@/components/SchoolDepartures";
import { DATA_LAST_UPDATED, FARES_2026 } from "@/lib/mobility-config";
import { getRouteSeoItems } from "@/lib/route-seo";
import { getSchedule } from "@/lib/schedules";
import { SITE_URL } from "@/lib/site-url";
import "@/app/transport.css";

export const metadata: Metadata = {
  title: "Horarios de camiones en Uruapan 2026 — Todas las rutas",
  description:
    "Horarios de rutas urbanas, Teleférico y salidas escolares reportadas hacia el CETIS 27, Tec Uruapan y Universidad Politécnica.",
  alternates: { canonical: `${SITE_URL}/horarios` },
  openGraph: {
    title: "Horarios de camiones en Uruapan — Todas las rutas",
    description: "Primer y último camión, frecuencia de paso y horario del Teleférico de Uruapan, en una sola tabla.",
    url: `${SITE_URL}/horarios`,
    type: "website",
  },
};

const faqs = [
  {
    question: "¿A qué hora pasa el primer camión en Uruapan?",
    answer:
      "La mayoría de las rutas urbanas inician entre 5:15 y 6:00 de la mañana. Las rutas con servicio más temprano son la Ruta 2 (5:15) y las rutas 1, 1A, 20 y 176 (5:30).",
  },
  {
    question: "¿Hasta qué hora hay camiones en Uruapan?",
    answer:
      "El servicio termina entre 21:00 y 22:30 según la ruta. La Ruta 176 es de las que más tarde circulan (hasta 23:30). El Teleférico opera hasta las 23:00.",
  },
  {
    question: "¿Cada cuánto pasa el camión?",
    answer:
      "En horas pico la mayoría de las rutas pasan cada 8 a 15 minutos. En horarios de baja demanda la frecuencia puede llegar a 20 minutos.",
  },
  {
    question: "¿Los horarios son exactos?",
    answer:
      `Los camiones urbanos en Uruapan no operan con horario fijo por parada: los rangos son aproximados y pueden variar por tráfico y día de la semana. Los datos se verificaron en campo y se actualizaron en ${DATA_LAST_UPDATED}.`,
  },
  {
    question: "¿Hay salidas especiales hacia el CETIS 27, Tec o Politécnico?",
    answer:
      "Existen referencias comunitarias de corridas que extienden rutas normales para llevar estudiantes de ida. Confirma el horario, punto de abordaje y destino con el plantel o transportista antes de salir.",
  },
] as const;

export default function HorariosPage() {
  const services: ScheduleService[] = getRouteSeoItems()
    .filter((route) => !route.name.toLowerCase().includes("teleférico"))
    .flatMap((route) => {
      const schedule = getSchedule(route.name);
      return schedule ? [{
        name: route.name,
        destination: route.destination,
        slug: route.slug,
        color: route.color,
        kind: "bus" as const,
        schedule,
      }] : [];
    });

  const telefericoSchedule = getSchedule("Teleférico Uruapan");
  if (telefericoSchedule) {
    services.unshift({
      name: "Teleférico Uruapan",
      destination: "6 estaciones",
      slug: "teleferico-uruapan",
      color: "#00D4AA",
      kind: "teleferico",
      schedule: telefericoSchedule,
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Horarios", item: `${SITE_URL}/horarios` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };

  return (
    <main className="public-page transport-page min-h-dvh bg-[var(--public-bg)] text-[var(--public-ink)]">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader active="horarios" />

      <div className="transport-shell">
        <div>
          <header className="transport-heading">
            <div><p className="transport-eyebrow">Planea tu salida · Uruapan</p>
            <h1 className="public-page-title">Horarios de <em>rutas</em></h1>
            <p className="transport-lead">Revisa a qué hora empieza, a qué hora termina y cada cuánto pasa tu transporte.</p></div>
            <nav aria-label="Más opciones de transporte" className="transport-shortcuts">
              <Link href="/rutas" className="transport-button">Ver rutas</Link>
              <a href="#salidas-escolares" className="transport-button">Salidas escolares ↓</a>
            </nav>
          </header>

          <ScheduleDirectory services={services} />

          <p className="schedule-caption">
            Datos actualizados en {DATA_LAST_UPDATED}. Tarifa de camión: {FARES_2026.urbanBus.price} por abordaje, en efectivo.
          </p>

          <div className="mt-8">
            <SchoolDepartures />
          </div>

          <section className="mt-8">
            <h2 className="public-section-title">Preguntas frecuentes</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-sans text-sm font-bold [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span className="shrink-0 text-lg text-[var(--public-accent)] transition group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-6 text-[var(--public-secondary)]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/mapa" className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--brand-lime)] px-6 text-sm font-bold text-[var(--brand-deep)] transition hover:bg-[#e7ffa7]">
              Planear mi viaje en el mapa
            </Link>
            <Link href="/rutas" className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--public-border)] px-6 text-sm font-bold text-[var(--public-ink)] transition hover:bg-[var(--public-hover)]">
              Ver directorio de rutas
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

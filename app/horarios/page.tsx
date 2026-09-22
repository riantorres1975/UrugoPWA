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
    <main className="public-page min-h-dvh bg-[#0c110a] text-[var(--public-ink)]">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader active="horarios" />

      <div className="px-5 pb-12 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <header>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--public-accent)]">Muévete por Uruapan</p>
            <h1 className="public-page-title mt-2 text-3xl sm:text-4xl">Horarios de transporte</h1>
            <p className="mt-2 text-sm leading-5 text-[var(--public-secondary)]">Consulta el inicio, cierre y frecuencia de tu ruta.</p>
            <nav aria-label="Más opciones de transporte" className="mt-3 flex flex-wrap gap-x-5 text-sm font-bold text-[var(--public-accent)]">
              <Link href="/rutas" className="inline-flex min-h-11 items-center hover:underline">Todas las rutas →</Link>
              <a href="#salidas-escolares" className="inline-flex min-h-11 items-center hover:underline">Salidas escolares ↓</a>
            </nav>
          </header>

          <ScheduleDirectory services={services} />

          <p className="mt-3 text-[11px] text-[var(--public-muted)]">
            Actualizado {DATA_LAST_UPDATED}. Tarifa base: {FARES_2026.urbanBus.price} por abordaje. “En servicio” indica que la hora actual está dentro del rango general de operación; no representa seguimiento en tiempo real de las unidades.
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
            <Link href="/mapa" className="inline-flex h-12 items-center justify-center rounded-md bg-[#6aab48] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#77bc52]">
              Planear mi viaje en el mapa
            </Link>
            <Link href="/rutas" className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--public-border)] px-6 text-sm font-bold text-[var(--public-ink)] transition hover:bg-white/[0.04]">
              Ver directorio de rutas
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

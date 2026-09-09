import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleLayout from "@/components/BlogArticleLayout";
import PageHeader from "@/components/PageHeader";
import { FARES_2026 } from "@/lib/mobility-config";

export const metadata: Metadata = {
  title: "Guía de transporte público para estudiantes en Uruapan",
  description: "37 escuelas conectadas al sistema, horarios que cubren todos los turnos, Wi-Fi en el Teleférico y cámaras en los camiones. Todo lo que necesitas saber.",
  alternates: {
    canonical: "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan"
  },
  openGraph: {
    title: "Guía de transporte público para estudiantes en Uruapan",
    description: "37 escuelas conectadas, todos los turnos cubiertos y tips para moverte en camión y Teleférico siendo estudiante en Uruapan.",
    url: "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan",
    type: "article",
    publishedTime: "2026-01-20T00:00:00-06:00",
    modifiedTime: "2026-04-27T00:00:00-06:00",
    images: [{
      url: "https://www.urugo.app/api/og?title=Gu%C3%ADa+de+transporte+para+estudiantes+en+Uruapan&subtitle=Uruapan%2C+Michoac%C3%A1n",
      width: 1200,
      height: 630,
      alt: "Guía de transporte público para estudiantes en Uruapan"
    }]
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.urugo.app/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.urugo.app/blog" },
        { "@type": "ListItem", position: 3, name: "Guía de transporte para estudiantes en Uruapan", item: "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan" }
      ]
    },
    {
      "@type": "BlogPosting",
      headline: "Guía de transporte público para estudiantes en Uruapan",
      description: "Guía para estudiantes que se mueven en camión urbano, Teleférico y rutas cercanas a escuelas en Uruapan.",
      datePublished: "2026-01-20",
      dateModified: "2026-04-27",
      author: { "@type": "Organization", name: "UruGo" },
      publisher: { "@type": "Organization", name: "UruGo" },
      mainEntityOfPage: { "@type": "WebPage", "@id": "https://www.urugo.app/blog/guia-transporte-publico-estudiantes-uruapan" },
      inLanguage: "es-MX",
      image: "https://www.urugo.app/api/og?title=Gu%C3%ADa+de+transporte+para+estudiantes+en+Uruapan&subtitle=Uruapan%2C+Michoac%C3%A1n",
      keywords: "transporte escolar Uruapan, camión estudiantes Uruapan, teleférico estudiantes, rutas camión escuelas Uruapan"
    }
  ]
};

const CARDS = [
  {
    eyebrow: "Cobertura escolar",
    title: "37 escuelas conectadas",
    body: "El sistema está diseñado para la comunidad escolar: 37 escuelas de distintos niveles se encuentran en las inmediaciones de las estaciones del Teleférico y sus conexiones terrestres."
  },
  {
    eyebrow: "Horarios",
    title: "Todos los turnos cubiertos",
    body: "Teleférico de 5:00 a.m. a 11:00 p.m. sin interrupción. Camiones troncales (Ruta 11 y similares) de 06:00 a 22:00 h. Ideal para prepa temprana o universidad nocturna."
  },
  {
    eyebrow: "Seguridad",
    title: "5 cámaras + botón de pánico",
    body: "Cada camión nuevo lleva cinco cámaras de videovigilancia y un botón de pánico. Además, los sistemas detectan si el chofer usa el celular o excede la velocidad."
  },
  {
    eyebrow: "Conectividad",
    title: "Wi-Fi gratis en el Teleférico",
    body: "Las cabinas tienen Wi-Fi de alta velocidad e iluminación LED. Úsalo para leer, mandar tareas o estudiar durante los hasta 27 minutos de trayecto."
  },
  {
    eyebrow: "Costo y pago",
    title: `${FARES_2026.urbanBus.price} por abordaje`,
    body: "La tarifa base es la misma para camión y Teleférico, pero el método de pago cambia: efectivo en el camión y tarjeta electrónica de movilidad en el Teleférico."
  }
] as const;

export default function GuiaEstudiantesPage() {
  return (
    <BlogArticleLayout
      currentSlug="guia-transporte-publico-estudiantes-uruapan"
      readingTime="7 min"
      toc={[{ id: "datos-clave", label: "Datos clave" }, { id: "planear", label: "Planear el trayecto" }]}
      jsonLd={jsonLd}
      actionHref="/como-llegar"
      actionLabel="Buscar mi escuela"
    >
        <PageHeader
          eyebrow="En preparación"
          title={
            <>
              Guía para <span className="italic text-lima">estudiantes</span> en Uruapan.
            </>
          }
          intro="37 escuelas conectadas, Wi-Fi en el Teleférico y cámaras en los camiones. Todo lo que necesitas para moverte entre prepa, uni y casa."
        />

        <section id="datos-clave" className="mt-12 scroll-mt-40 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-lg border border-foreground/10 bg-ink-900/60 p-5"
            >
              <p className="text-[10px] font-bold uppercase text-lima">{card.eyebrow}</p>
              <h3 className="mt-1 font-sans text-lg font-bold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{card.body}</p>
            </div>
          ))}
        </section>

        <section id="planear" className="mt-8 scroll-mt-40 border-t border-foreground/12 pt-8">
          <h2 className="text-white public-section-title">Próximamente</h2>
          <p className="mt-3 text-sm leading-7 text-foreground/75">
            Estamos armando esta guía con la ubicación de las 37 escuelas conectadas al sistema, horarios pico, rutas terrestres recomendadas y cómo aprovechar el Wi-Fi gratuito y las cámaras de seguridad en tus trayectos de prepa o universidad. Mientras tanto, planea tu viaje en el mapa.
          </p>
          <Link
            href="/mapa"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#b8e840] px-6 py-2 text-sm font-bold text-[#0c110a] hover:bg-[#c6f052]"
          >
            Planear mi trayecto →
          </Link>
        </section>

    </BlogArticleLayout>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import BlogArticleLayout from "@/components/BlogArticleLayout";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Las rutas de camión más usadas en Uruapan",
  description: "Estamos preparando un ranking detallado de las rutas más consultadas, sus destinos principales y cómo conectan con el Teleférico.",
  alternates: {
    canonical: "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan"
  },
  openGraph: {
    title: "Las rutas de camión más usadas en Uruapan",
    description: "Rutas de camión más consultadas en Uruapan: destinos, conexiones con Teleférico y mapa interactivo.",
    url: "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan",
    type: "article",
    publishedTime: "2026-01-15T00:00:00-06:00",
    modifiedTime: "2026-04-27T00:00:00-06:00",
    images: [{
      url: "https://www.urugo.app/api/og?title=Las+rutas+de+cami%C3%B3n+m%C3%A1s+usadas+en+Uruapan&subtitle=Uruapan%2C+Michoac%C3%A1n",
      width: 1200,
      height: 630,
      alt: "Las rutas de camión más usadas en Uruapan"
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
        { "@type": "ListItem", position: 3, name: "Las rutas de camión más usadas en Uruapan", item: "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan" }
      ]
    },
    {
      "@type": "BlogPosting",
      headline: "Las rutas de camión más usadas en Uruapan y para qué sirven",
      description: "Resumen de las rutas de camión más consultadas en Uruapan, sus destinos principales y cómo conectan con el Teleférico.",
      datePublished: "2026-01-15",
      dateModified: "2026-04-27",
      author: { "@type": "Organization", name: "UruGo" },
      publisher: { "@type": "Organization", name: "UruGo" },
      mainEntityOfPage: { "@type": "WebPage", "@id": "https://www.urugo.app/blog/rutas-camion-mas-usadas-uruapan" },
      inLanguage: "es-MX",
      image: "https://www.urugo.app/api/og?title=Las+rutas+de+cami%C3%B3n+m%C3%A1s+usadas+en+Uruapan&subtitle=Uruapan%2C+Michoac%C3%A1n",
      keywords: "rutas de camión Uruapan, ruta 11 Uruapan, transporte público Uruapan, camiones urbanos Uruapan"
    }
  ]
};

export default function RutasCamionMasUsadasPage() {
  return (
    <BlogArticleLayout
      currentSlug="rutas-camion-mas-usadas-uruapan"
      readingTime="5 min"
      toc={[{ id: "rutas-destacadas", label: "Rutas destacadas" }, { id: "explorar", label: "Explorar las 40 rutas" }]}
      jsonLd={jsonLd}
      actionHref="/rutas"
      actionLabel="Consultar las 40 rutas"
    >
        <PageHeader
          eyebrow="En preparación"
          title={
            <>
              Las rutas de <span className="italic text-lima">camión</span> más usadas en Uruapan.
            </>
          }
          intro="Estamos preparando un ranking detallado de las rutas más consultadas, sus destinos principales y cómo conectan con el Teleférico."
        />

        {/* Rutas destacadas */}
        <section id="rutas-destacadas" className="mt-12 scroll-mt-40 grid gap-4 sm:grid-cols-2">
          {[
            {
              id: "Ruta 11 Uruapan",
              nombre: "Ramal Tamayo – Fovissste",
              detalle: "70 paradas · ~48 min · lun–dom 06:00–22:00",
              desc: "Una de las más extensas. Transita por 5 Sur y Héroes de la Independencia."
            },
            {
              id: "Ruta 1",
              nombre: "Unidad – Palito Verde",
              detalle: "Ramales a Jucutácato, Manantiales y San José Mina",
              desc: "Línea troncal con alta cobertura de colonias populares al oriente."
            },
            {
              id: "Ruta 5",
              nombre: "Caltzontzin",
              detalle: "Corredor industrial",
              desc: "Mueve gran parte de la fuerza laboral hacia la comunidad de Caltzontzin."
            },
            {
              id: "Ruta 7",
              nombre: "Pemex – Centro",
              detalle: "Línea directa al primer cuadro",
              desc: "Conecta la colonia Pemex con el Centro Histórico sin transbordo."
            }
          ].map((r) => (
            <Link
              key={r.id}
              href={`/mapa?destino=${encodeURIComponent(r.id)}`}
              className="group rounded-lg border border-foreground/10 bg-ink-900/60 p-5 transition hover:border-[#6aab48]/40"
            >
              <p className="text-[10px] font-bold uppercase text-lima">{r.id}</p>
              <h3 className="mt-1 font-sans text-lg font-bold text-white">{r.nombre}</h3>
              <p className="mt-1 text-[11px] font-semibold text-avocado-400">{r.detalle}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/70">{r.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-lima transition group-hover:gap-2">
                Ver en el mapa →
              </span>
            </Link>
          ))}
        </section>

        <section id="explorar" className="mt-8 scroll-mt-40 border-t border-foreground/12 pt-8">
          <h2 className="text-white public-section-title">
            Próximamente
          </h2>
          <p className="mt-3 text-sm leading-7 text-foreground/75">
            Mientras terminamos esta guía, puedes explorar todas las rutas en el mapa interactivo. Son 40 rutas de camión urbano y el Teleférico que cubren toda la ciudad.
          </p>
          <Link
            href="/mapa"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#b8e840] px-6 py-2 text-sm font-bold text-[#0c110a] hover:bg-[#c6f052]"
          >
            Explorar el mapa →
          </Link>
        </section>

    </BlogArticleLayout>
  );
}

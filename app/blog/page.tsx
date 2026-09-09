import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { BLOG_ARTICLES } from "@/lib/blog-content";

export const metadata: Metadata = {
  title: "Blog de transporte público en Uruapan",
  description: "Guías locales sobre rutas de camiones, Teleférico, tarifas y movilidad en Uruapan.",
  alternates: {
    canonical: "https://www.urugo.app/blog"
  },
  openGraph: {
    title: "Blog de transporte público en Uruapan",
    description: "Guías locales para moverte en camión, Teleférico y rutas urbanas de Uruapan.",
    url: "https://www.urugo.app/blog",
    images: [{
      url: "https://www.urugo.app/api/og?title=Blog+de+transporte+en+Uruapan&subtitle=Gu%C3%ADas+locales",
      width: 1200,
      height: 630,
      alt: "Blog de transporte público en Uruapan"
    }]
  }
};

const READING_TIME = ["6 min", "5 min", "7 min"] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.urugo.app/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.urugo.app/blog" }
      ]
    },
    {
      "@type": "Blog",
      name: "Blog de transporte público en Uruapan",
      description: "Guías locales sobre rutas de camiones, Teleférico, tarifas y movilidad en Uruapan.",
      url: "https://www.urugo.app/blog",
      inLanguage: "es-MX",
      publisher: { "@type": "Organization", name: "UruGo", url: "https://www.urugo.app" },
      blogPost: BLOG_ARTICLES.map((article) => ({
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        url: `https://www.urugo.app/blog/${article.slug}`,
        datePublished: article.date,
        dateModified: article.updatedAt
      }))
    }
  ]
};

export default function BlogIndexPage() {
  return (
    <main className="public-page" style={{ background: "var(--public-bg)", color: "var(--public-ink)", minHeight: "100dvh" }}>
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />
      <div className="px-5 pt-28 pb-8 sm:px-8 lg:px-10">
      <div className="relative z-10 mx-auto max-w-5xl">
        <PageHeader
          kicker="Uandakuecha · palabras"
          eyebrow="Guías locales"
          title={
            <>
              Cómo se mueve <span style={{ color: "var(--public-accent)" }}>Uruapan</span>.
            </>
          }
          intro="Artículos prácticos para saber cómo llegar, cuánto cuesta y cómo combinar camión urbano con Teleférico. Escritos desde aquí, para aquí."
        />

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          {BLOG_ARTICLES.map((article, index) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className={`group relative overflow-hidden rounded-lg border backdrop-blur transition ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-[1.1fr_0.9fr]" : "p-6"}`}
              style={{
                borderColor: "var(--public-border)",
                background: "var(--public-surface)",
              }}
            >
              {index === 0 && (
                <div className="relative min-h-64 overflow-hidden border-b border-[var(--public-border)] md:border-b-0 md:border-r">
                  <Image src="/screenshots/mapa-wide.png" alt="Mapa de UruGo con rutas de transporte en Uruapan" fill sizes="(min-width: 768px) 48vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c110a]/80 to-transparent md:bg-gradient-to-r" />
                </div>
              )}
              <div className={`relative ${index === 0 ? "p-6 md:p-8" : ""}`}>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase">
                  <span style={{ color: "var(--public-accent)" }}>{article.date}</span>
                  <span className="h-1 w-1 rounded-full" style={{ background: "rgba(232,242,216,0.2)" }} />
                  <span style={{ color: "var(--public-ink)" }}>{READING_TIME[index] ?? "5 min"} de lectura</span>
                </div>

                <h2 className="mt-4 public-section-title" style={{ color: "var(--public-ink)" }}>
                  {article.title}
                </h2>
                <p className="mt-3 text-sm leading-7" style={{ color: "var(--public-ink)" }}>
                  {article.description}
                </p>

                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: "var(--public-accent)" }}>
                  Leer guía
                  <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-12">
          <NotGovernmentNotice variant="compact" />
        </div>
      </div>
      </div>
      <PublicFooter />
    </main>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import ForceDark from "@/components/ForceDark";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import { BLOG_ARTICLES } from "@/lib/blog-content";

type TocItem = { id: string; label: string };

type Props = {
  currentSlug: string;
  readingTime: string;
  toc: TocItem[];
  jsonLd: object;
  actionHref: string;
  actionLabel: string;
  children: ReactNode;
};

export default function BlogArticleLayout({
  currentSlug,
  readingTime,
  toc,
  jsonLd,
  actionHref,
  actionLabel,
  children,
}: Props) {
  const article = BLOG_ARTICLES.find((item) => item.slug === currentSlug);
  const related = BLOG_ARTICLES.filter((item) => item.slug !== currentSlug).slice(0, 2);
  const updatedAt = article
    ? new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${article.updatedAt}T00:00:00Z`))
    : null;

  return (
    <main className="public-page min-h-dvh bg-[#0c110a] text-[var(--public-ink)]">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicHeader />

      <div className="px-5 pb-16 pt-28 sm:px-8 lg:px-10">
        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--public-border)] pb-5">
            <Link href="/blog" className="text-xs font-bold uppercase text-[var(--public-muted)] transition hover:text-[var(--public-accent)]">
              ← Guías locales
            </Link>
            <p className="text-xs text-[var(--public-muted)]">
              {readingTime} de lectura{updatedAt ? ` · Actualizado ${updatedAt}` : ""}
            </p>
          </div>

          <nav aria-label="Contenido del artículo" className="sticky top-[72px] z-20 -mx-5 mt-5 flex gap-2 overflow-x-auto border-y border-[var(--public-border)] bg-[#0c110a]/95 px-5 py-3 backdrop-blur-xl [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
            {toc.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="shrink-0 rounded-md border border-[var(--public-border)] px-3 py-1.5 text-xs font-bold text-[var(--public-secondary)]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-9 grid gap-12 lg:grid-cols-[190px_minmax(0,760px)] lg:justify-center">
            <aside className="hidden lg:block">
              <div className="sticky top-28 border-l border-[var(--public-border)] pl-5">
                <p className="text-[10px] font-bold uppercase text-[var(--public-muted)]">En esta guía</p>
                <nav aria-label="Índice del artículo" className="mt-4 flex flex-col gap-3">
                  {toc.map((item) => (
                    <a key={item.id} href={`#${item.id}`} className="text-sm font-semibold leading-5 text-[var(--public-secondary)] transition hover:text-[var(--public-accent)]">
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="min-w-0">{children}</article>
          </div>

          <section className="mx-auto mt-14 max-w-[950px] border-y border-[var(--public-border)] py-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--public-muted)]">Llévalo a la práctica</p>
                <h2 className="mt-2 public-section-title">Planea tu siguiente trayecto.</h2>
              </div>
              <Link href={actionHref} className="inline-flex h-11 items-center justify-center rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]">
                {actionLabel}
              </Link>
            </div>
          </section>

          <section className="mx-auto mt-12 max-w-[950px]">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--public-muted)]">Sigue explorando</p>
                <h2 className="mt-2 public-section-title">Más guías de UruGo</h2>
              </div>
              <Link href="/blog" className="text-sm font-bold text-[var(--public-accent)]">Ver todas →</Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {related.map((item) => (
                <Link key={item.slug} href={`/blog/${item.slug}`} className="group rounded-lg border border-[var(--public-border)] bg-[var(--public-surface)] p-5 transition hover:border-[#6aab48]/40">
                  <h3 className="font-sans text-lg font-bold leading-snug">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--public-muted)]">{item.description}</p>
                  <span className="mt-4 inline-flex text-xs font-bold text-[var(--public-accent)] transition group-hover:translate-x-1">Leer guía →</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="mx-auto mt-10 max-w-[950px]"><NotGovernmentNotice variant="compact" /></div>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}

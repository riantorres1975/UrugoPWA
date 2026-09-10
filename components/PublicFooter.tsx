import Link from "next/link";
import {
  ArrowUpRight,
  FileCode2,
  Heart,
} from "lucide-react";
import Logo from "@/components/Logo";
import { PROJECT } from "@/lib/project";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 8.36 22.9c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.38-3.9-1.38-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.57-.29-5.28-1.29-5.28-5.73 0-1.27.45-2.3 1.2-3.12-.12-.29-.52-1.47.11-3.07 0 0 .98-.31 3.2 1.2a11.1 11.1 0 0 1 5.82 0c2.22-1.51 3.2-1.2 3.2-1.2.63 1.6.23 2.78.11 3.07.75.82 1.2 1.85 1.2 3.12 0 4.46-2.72 5.43-5.3 5.72.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.37 4.27 5.46v6.28ZM5.32 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.54V9H7.1v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2h3.4l-7.5 8.56L23.6 22h-6.9l-5.4-7.06L5.1 22H1.7l8-9.15L1.2 2h7.1l4.88 6.45L18.9 2Zm-1.2 17.98h1.88L7.28 3.91H5.26l12.44 16.07Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.53.02c1.3-.02 2.6-.01 3.9-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a12.2 12.2 0 0 1-4.2-.97c-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75a7.22 7.22 0 0 1-1.35 3.94A7.36 7.36 0 0 1 9.32 24a7.08 7.08 0 0 1-4.08-1.03 7.4 7.4 0 0 1-3.65-5.72c-.02-.5-.03-1-.01-1.48a7.32 7.32 0 0 1 2.58-4.96 7.18 7.18 0 0 1 6.15-1.72c.02 1.48-.04 2.96-.04 4.44a3.25 3.25 0 0 0-3.02.37 3.05 3.05 0 0 0-1.36 1.75c-.21.51-.15 1.08-.14 1.62.24 1.64 1.82 3.02 3.5 2.87a3.2 3.2 0 0 0 2.77-1.61c.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.03-12.09Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

const exploreLinks = [
  { label: "Rutas", href: "/rutas" },
  { label: "Horarios", href: "/horarios" },
  { label: "Cómo llegar", href: "/como-llegar" },
  { label: "Teleférico", href: "/teleferico-uruapan-horario" },
  { label: "Guía de uso", href: "/guia" },
  { label: "Guías locales", href: "/blog" },
  { label: "Cómo se hace UruGo", href: "/acerca-de" },
  { label: "Datos y API", href: "/datos-api" },
  { label: "Apoyar UruGo", href: "/apoyar" },
] as const;

const socialLinks = [
  { label: "GitHub de Antonio", shortLabel: "GitHub", href: PROJECT.githubUrl, icon: GithubIcon },
  { label: "X de Antonio", shortLabel: null, href: PROJECT.xUrl, icon: XIcon },
  { label: "TikTok de Antonio", shortLabel: "TikTok", href: PROJECT.tiktokUrl, icon: TikTokIcon },
  { label: "Instagram de Antonio", shortLabel: "Instagram", href: PROJECT.instagramUrl, icon: InstagramIcon },
  { label: "LinkedIn de Antonio", shortLabel: "LinkedIn", href: PROJECT.linkedinUrl, icon: LinkedinIcon },
] as const;

export default function PublicFooter() {
  return (
    <footer className="public-page border-t border-[var(--public-border)] bg-[#090d08] px-5 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 py-10 sm:py-12 lg:grid-cols-[1.35fr_0.8fr_1fr] lg:gap-14">
          <div>
            <Logo size={26} showName href="/" />
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--public-secondary)]">
              Transporte público de Uruapan con datos locales, mapas claros y herramientas gratuitas.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={PROJECT.supportUrl}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#6aab48] px-5 text-sm font-bold text-[#0c110a] transition hover:bg-[#7cbd59] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8e840]"
              >
                <Heart className="h-4 w-4" aria-hidden="true" />
                Apoyar UruGo
              </Link>
              <Link
                href={PROJECT.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--public-border)] px-5 text-sm font-bold text-[var(--public-ink)] transition hover:border-[#6aab48]/60 hover:bg-[#6aab48]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8e840]"
              >
                <FileCode2 className="h-4 w-4" aria-hidden="true" />
                Ver código
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <nav aria-label="Explorar UruGo">
            <p className="text-xs font-bold uppercase text-[var(--public-accent)]">Explorar</p>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm font-semibold text-[var(--public-secondary)] lg:grid-cols-1">
              {exploreLinks.map((link) => (
                <Link key={link.href} href={link.href} className="w-fit transition hover:text-[var(--public-ink)]">
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div>
            <p className="text-xs font-bold uppercase text-[var(--public-accent)]">Proyecto independiente</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--public-secondary)]">
              Hecho en Uruapan por <span className="font-semibold text-[var(--public-ink)]">{PROJECT.author}</span>. Tu apoyo ayuda a mantener el mapa, el dominio y las mejoras futuras.
            </p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="Redes sociales del creador">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="me noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-full border border-[var(--public-border)] px-3 text-xs font-bold text-[var(--public-secondary)] transition hover:border-[#6aab48]/50 hover:bg-[#6aab48]/10 hover:text-[var(--public-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8e840]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.shortLabel ? (
                      <span className="sr-only sm:not-sr-only">{link.shortLabel}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--public-border)] py-6 text-xs text-[var(--public-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>UruGo no está afiliado al gobierno ni a las empresas de transporte.</p>
          <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-2 font-semibold">
            <Link href="/acerca-de" className="transition hover:text-[var(--public-ink)]">Metodología y autor</Link>
            <Link href="/datos-api" className="transition hover:text-[var(--public-ink)]">Datos y API</Link>
            <Link href="/reportar-error" className="transition hover:text-[var(--public-ink)]">Reportar un error</Link>
            <Link href="/privacidad" className="transition hover:text-[var(--public-ink)]">Privacidad</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

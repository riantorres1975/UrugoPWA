import Link from "next/link";
import { Map } from "lucide-react";
import SiteBrand from "@/components/SiteBrand";
import PublicMobileMenu from "@/components/PublicMobileMenu";

const links = [
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "/como-llegar", label: "Destinos" },
  { href: "/guia", label: "Guía" },
  { href: "/reportar-error", label: "Reportar error" },
] as const;

type Props = {
  active?: "rutas" | "horarios" | "como-llegar" | "guia" | "reportar-error";
  mapHref?: string;
};

export default function PublicHeader({ active, mapHref = "/mapa" }: Props) {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-2 px-[var(--brand-gutter)]">
        <SiteBrand />

        <nav aria-label="Navegación principal" className="hidden items-center gap-4 lg:flex xl:gap-7">
          {links.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="site-nav-link inline-flex min-h-11 items-center text-sm"
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={mapHref}
            className="site-map-button inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs font-bold sm:px-5 sm:text-sm"
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            Abrir mapa
          </Link>
          <PublicMobileMenu />
        </div>
      </div>
    </header>
  );
}

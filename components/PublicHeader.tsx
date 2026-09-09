import Link from "next/link";
import { MapPin } from "lucide-react";
import Logo from "@/components/Logo";
import PublicMobileMenu from "@/components/PublicMobileMenu";

const links = [
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "/como-llegar", label: "Cómo llegar" },
  { href: "/guia", label: "Guía" },
  { href: "/reportar-error", label: "Reportar error" },
] as const;

type Props = {
  active?: "rutas" | "horarios" | "como-llegar" | "guia" | "reportar-error";
  mapHref?: string;
};

export default function PublicHeader({ active, mapHref = "/mapa" }: Props) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0c110a]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-2 whitespace-nowrap px-4 sm:px-8">
        <Logo size={28} showName showSub />

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className="rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-white/[0.05] hover:text-[#e8f2d8]"
                style={{ color: isActive ? "#b8e840" : "#a8c888" }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <PublicMobileMenu />

          <Link
            href={mapHref}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#b8e840] px-3 text-xs font-bold text-[#0c110a] transition hover:bg-[#c8f25b] sm:px-5 sm:text-sm"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Abrir mapa
          </Link>
        </div>
      </div>
    </header>
  );
}

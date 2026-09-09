"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const links = [
  { href: "/reportar-error", label: "Reportar un error" },
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "/como-llegar", label: "Cómo llegar" },
  { href: "/guia", label: "Guía" },
  { href: "/blog", label: "Guías locales" },
  { href: "/acerca-de", label: "Acerca de UruGo" },
  { href: "/datos-api", label: "Datos y API" },
] as const;

export default function PublicMobileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeMenu = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }

      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", closeMenu);
    document.addEventListener("pointerdown", closeMenu);
    return () => {
      document.removeEventListener("keydown", closeMenu);
      document.removeEventListener("pointerdown", closeMenu);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-[#e8f2d8]"
        aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <nav
          id="public-mobile-navigation"
          aria-label="Navegación móvil"
          className="absolute right-0 top-12 w-52 overflow-hidden rounded-lg border border-white/10 bg-[#111a0d] p-1.5 shadow-2xl"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-semibold text-[#d2dfc4] transition hover:bg-white/[0.06]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

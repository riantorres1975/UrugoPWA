import Link from "next/link";
import { ArrowLeft, MapPin, Route } from "lucide-react";
import ForceDark from "@/components/ForceDark";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function NotFound() {
  return (
    <main className="public-page min-h-dvh">
      <ForceDark />
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:px-8 lg:pb-24 lg:pt-40">
        <p className="text-sm font-bold text-[var(--public-accent)]">404 / Enlace no encontrado</p>
        <h1 className="public-page-title mt-5 max-w-2xl">No encontramos esta página.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--public-secondary)]">
          El enlace pudo cambiar o la página ya no está disponible. Puedes buscar tu destino en el mapa o consultar el directorio de rutas.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/mapa" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#b8e840] px-6 text-sm font-bold text-[#0c110a] transition hover:bg-[#c6f052]">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Abrir mapa
          </Link>
          <Link href="/rutas" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--public-border)] px-6 text-sm font-bold transition hover:bg-[var(--public-surface)]">
            <Route className="h-4 w-4" aria-hidden="true" /> Ver rutas
          </Link>
        </div>
        <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[var(--public-secondary)] hover:text-[var(--public-accent)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al inicio
        </Link>
      </section>
      <PublicFooter />
    </main>
  );
}

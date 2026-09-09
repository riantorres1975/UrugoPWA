import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";

export default function LandingReports() {
  return (
    <section
      id="reportes"
      aria-labelledby="landing-reports-title"
      className="mt-6 scroll-mt-24 border-l-4 border-[#66d8e7] bg-[#182a29] px-5 py-5 text-[#e8f4f1] sm:mt-8 sm:px-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold text-[#85dbe0]">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Reportes de la comunidad
          </p>
          <h2 id="landing-reports-title" className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
            ¿El camión pasa por otro lado?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#b2ceca]">
            Marca por dónde pasa o avísanos si una ruta, un horario o la app están mal.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/reportar-error?from=inicio"
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#a8e5e5] px-5 text-sm font-bold text-[#142e30] transition hover:bg-[#c1f1ef] sm:w-auto"
          >
            Reportar un error
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="mt-2 text-xs text-[#b2ceca] sm:text-center">Revisión antes de publicar</p>
        </div>
      </div>
    </section>
  );
}

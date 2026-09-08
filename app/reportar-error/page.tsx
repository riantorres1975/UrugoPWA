import { Check, MapPinned, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import ForceDark from "@/components/ForceDark";
import NotGovernmentNotice from "@/components/NotGovernmentNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import ReportBugForm from "@/components/ReportBugForm";
import { findRouteSeoItem, getRouteSeoItems } from "@/lib/route-seo";

export const metadata: Metadata = {
  title: "Reportar un error",
  description: "Corrige una ruta de Uruapan y marca en el mapa por dónde pasa realmente.",
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  alternates: { canonical: "https://www.urugo.app/reportar-error" },
  openGraph: {
    title: "Reportar una corrección | UruGo",
    description: "Corrige una ruta de Uruapan y marca en el mapa por dónde pasa realmente.",
    url: "https://www.urugo.app/reportar-error",
    type: "website",
  },
};

type ReportErrorPageProps = {
  searchParams: Promise<{ ruta?: string; referencia?: string; clave?: string }>;
};

export default async function ReportErrorPage({ searchParams }: ReportErrorPageProps) {
  const params = await searchParams;
  const linkedRoute = params.clave ? findRouteSeoItem(params.clave.trim().slice(0, 140)) : null;
  const initialRoute = linkedRoute?.name ?? params.ruta?.trim().slice(0, 100) ?? "";
  const initialLandmark = params.referencia?.trim().slice(0, 120) ?? "";
  const routeOptions = getRouteSeoItems()
    .map(({ name, slug }) => ({ name, slug }))
    .sort((left, right) => left.name.localeCompare(right.name, "es-MX", { numeric: true }));

  return (
    <main className="min-h-dvh bg-[#0c110a] text-[#e8f2d8]">
      <ForceDark />
      <PublicHeader />

      <section className="border-b border-white/10 px-5 pb-9 pt-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-[#b8e840]">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Correcciones de la comunidad
          </div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-black leading-[1.04] sm:text-6xl">
            Ayúdanos a corregir una ruta.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#a8c888] sm:text-lg">
            Elige qué está mal, selecciona la ruta y cuéntanos lo que sabes. Si cambió el recorrido, puedes dibujarlo directamente sobre el mapa.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs font-bold text-[#78965f]">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#b8e840]" /> No necesitas cuenta</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b8e840]" /> Revisión antes de publicar</span>
            <span className="inline-flex items-center gap-2"><MapPinned className="h-4 w-4 text-[#48cce0]" /> Puedes marcar las calles</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-0 py-8 sm:px-8 lg:py-12">
        <ReportBugForm
          initialRoute={initialRoute}
          initialRouteKey={linkedRoute?.slug}
          initialLandmark={initialLandmark}
          routeOptions={routeOptions}
        />
        <div className="mx-5 mt-6 sm:mx-0">
          <NotGovernmentNotice variant="compact" />
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

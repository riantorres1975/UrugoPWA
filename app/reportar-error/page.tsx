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
    <main className="public-page min-h-dvh bg-[var(--public-bg)] text-[var(--public-ink)]">
      <ForceDark />
      <PublicHeader active="reportar-error" />

      <section className="border-b border-[var(--public-border)] px-5 pb-6 pt-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--public-accent)]">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Correcciones de la comunidad
          </div>
          <h1 className="mt-3 max-w-3xl public-page-title">
            ¿Algo cambió en tu ruta?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--public-secondary)]">
            Elige el problema y la ruta. Cuéntanos qué pasó o marca las calles en el mapa.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[var(--public-muted)]">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--public-accent)]" /> No necesitas cuenta</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--public-accent)]" /> Revisión antes de publicar</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-8 lg:py-8">
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

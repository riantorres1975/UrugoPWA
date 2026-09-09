import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Users,
  BusFront,
  CableCar,
  Crosshair,
  MapPin,
  MapPinned,
  Route,
  ScanSearch,
} from "lucide-react";
import LandingHeroPlanner from "@/components/LandingHeroPlanner";
import LandingReports from "@/components/LandingReports";
import ForceDark from "@/components/ForceDark";
import FareUpdateNotice from "@/components/FareUpdateNotice";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  TELEFERICO_URUAPAN,
} from "@/lib/mobility-config";
import { getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { PROJECT, PROJECT_SOCIAL_PROFILES } from "@/lib/project";
import { getRouteSeoItems } from "@/lib/route-seo";
import { SITE_URL } from "@/lib/site-url";

const HOW_IT_WORKS_STEPS = [
  { n: "01", icon: MapPinned, title: "Abre el mapa", desc: "Las 40 rutas ya están listas. No necesitas cuenta." },
  { n: "02", icon: Crosshair, title: "Marca tu origen", desc: "Usa el GPS o elige cualquier punto de forma manual." },
  { n: "03", icon: ScanSearch, title: "Busca tu destino", desc: "Escribe un negocio, hospital, colonia o lugar." },
  { n: "04", icon: Route, title: "Compara y viaja", desc: "Revisa opciones, transbordos, tiempo y costo." },
] as const;

const DEFERRED_SECTION = "[content-visibility:auto] [contain-intrinsic-size:auto_560px]";
const URBAN_FARE_DISPLAY = FARES_2026.urbanBus.price.replace(/\.00$/, "");
const TELEFERICO_FARE_DISPLAY = FARES_2026.teleferico.price.replace(/\.00$/, "");

const FEATURED_PLACE_LABELS = [
  "Centro",
  "Hospital Regional",
  "Central de Autobuses",
  "IMSS Hospital General de Zona 8",
  "Mercado Poniente",
  "Presidencia Municipal",
  "Unidad Deportiva",
  "Parque Lineal Cupatitzio",
] as const;

const allSeoPlaces = getPlaceSeoItems();
const featuredPlaces = FEATURED_PLACE_LABELS.map((label) => {
  const place = allSeoPlaces.find((item) => item.label === label);
  if (!place) return null;
  const routes = getRoutesNearPlace(place.center);
  if (routes.length === 0) return null;
  return {
    slug: place.slug,
    label: place.label,
    routeCount: routes.length,
    nearestWalkMin: walkMinutesFor(routes[0].distanceM),
  };
}).filter((place): place is NonNullable<typeof place> => place !== null);

const FEATURED_ROUTE_NAMES = ["Ruta 176", "Ruta 17", "Ruta 45", "Ruta 10"] as const;
const allSeoRoutes = getRouteSeoItems();
const featuredRoutes = FEATURED_ROUTE_NAMES.map((name) => allSeoRoutes.find((route) => route.name === name))
  .filter((route): route is NonNullable<typeof route> => route !== undefined);

export const metadata: Metadata = {
  title: { absolute: "UruGo | Rutas de camiones en Uruapan: mapa y horarios" },
  description:
    "UruGo te ayuda a encontrar qué camión tomar en Uruapan. Consulta 40 rutas y el Teleférico en un mapa con horarios y tarifas 2026.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "UruGo | Encuentra tu ruta en Uruapan",
    description: "Rutas de camiones urbanos y Teleférico en un solo mapa para Uruapan, Michoacán.",
    url: SITE_URL,
    siteName: "UruGo",
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630, alt: "UruGo — rutas de camiones y Teleférico en Uruapan" }],
    locale: "es_MX",
    type: "website",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: APP_BRAND.name,
  url: SITE_URL,
  applicationCategory: "TravelApplication",
  operatingSystem: "Web, Android, iOS",
  description: APP_BRAND.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "MXN" },
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" },
  provider: { "@id": `${SITE_URL}/#organization` },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: APP_BRAND.name,
  alternateName: ["UruGo App", "urugo.app"],
  url: SITE_URL,
  inLanguage: "es-MX",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: APP_BRAND.name,
  alternateName: "UruGo App",
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  areaServed: { "@type": "City", name: "Uruapan, Michoacán" },
  founder: {
    "@type": "Person",
    name: PROJECT.author,
    sameAs: [...PROJECT_SOCIAL_PROFILES],
  },
  sameAs: [...PROJECT_SOCIAL_PROFILES, PROJECT.repositoryUrl],
  publishingPrinciples: `${SITE_URL}/acerca-de`,
};

export default function LandingPage() {
  return (
    <main className="landing-home min-h-dvh bg-[#0c110a] text-[#eef2ea]" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <PublicHeader />
      <FareUpdateNotice />

      <section className="mx-auto max-w-[1240px] px-5 pb-12 pt-28 sm:px-8 lg:pb-16 lg:pt-32">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
          <p className="flex items-center gap-3 text-sm font-semibold">
            <span className="text-lg font-black text-[#b8e840]">UruGo</span>
            <span className="h-4 border-l border-white/25" aria-hidden="true" />
            Uruapan, Michoacán
          </p>
          <span className="text-xs text-[#a8b5a1]">Gratis · Sin cuenta · Sin anuncios</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end lg:gap-12">
          <h1 className="max-w-[810px] text-[36px] font-extrabold leading-[1.1] sm:text-5xl lg:text-[56px]">
            Encuentra qué camión tomar en <span className="text-[#b8e840]">Uruapan.</span>
          </h1>
          <p className="max-w-lg text-sm leading-6 text-[#b6c1af] lg:pb-1">
            Busca tu destino y compara recorridos de camión y Teleférico.
          </p>
        </div>
        <LandingHeroPlanner>
          <LandingReports />
        </LandingHeroPlanner>
      </section>

      <section id="transporte" className="scroll-mt-24 border-y border-white/15 bg-[#171e14]">
        <div className="mx-auto grid max-w-[1240px] divide-y divide-white/15 px-5 sm:px-8 md:grid-cols-2 md:divide-x md:divide-y-0">
          {[
            { href: "/rutas", icon: BusFront, title: "Camión urbano", detail: "40 rutas por la ciudad", fare: URBAN_FARE_DISPLAY, payment: "Efectivo", color: "#66d8e7", link: "Explorar rutas" },
            { href: "/teleferico-uruapan-horario", icon: CableCar, title: "Teleférico Uruapan", detail: `6 estaciones · ${TELEFERICO_URUAPAN.hours}`, fare: TELEFERICO_FARE_DISPLAY, payment: "Tarjeta", color: "#f4d25e", link: "Ver horarios y estaciones" },
          ].map(({ href, icon: Icon, title, detail, fare, payment, color, link }) => (
            <Link key={href} href={href} className="group grid grid-cols-[44px_minmax(0,1fr)] gap-4 py-7 transition hover:bg-white/[0.03] md:px-6 md:py-9">
              <Icon className="h-9 w-9" style={{ color }} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <h2 className="text-lg font-bold">{title}</h2>
                  <p className="text-sm font-bold" style={{ color }}>{fare} · {payment}</p>
                </div>
                <p className="mt-1 text-sm text-[#b6c1af]">{detail}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold">{link}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="destinos" className={`public-directory scroll-mt-24 border-y border-[var(--public-border)] ${DEFERRED_SECTION}`}>
        <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 lg:py-16">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--public-muted)]">Destinos cotidianos</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">¿A dónde vas hoy?</h2>
            </div>
            <Link href="/como-llegar" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--public-accent)] underline decoration-[var(--public-border)] underline-offset-4">Todos los destinos<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid border-t border-[var(--public-border)] md:grid-cols-2 md:gap-x-10">
            {featuredPlaces.map((place) => (
              <Link key={place.slug} href={`/como-llegar/${place.slug}`} className="group grid min-h-[88px] grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-3 border-b border-[var(--public-border)] py-4 transition hover:bg-[var(--public-hover)]">
                <MapPin className="h-5 w-5 text-[var(--public-accent)]" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold">{place.label}</span>
                  <span className="mt-1 block text-xs text-[var(--public-muted)]">{place.routeCount} {place.routeCount === 1 ? "ruta" : "rutas"} cerca · desde {place.nearestWalkMin} min a pie</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--public-muted)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="mt-10 border-t border-[var(--public-border)] pt-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold">Rutas más consultadas</h3>
              <Link href="/rutas" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold">Ver las 40 rutas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {featuredRoutes.map((route) => (
                <Link key={route.slug} href={`/ruta/${route.slug}`} className="group flex min-h-36 flex-col items-start rounded-md border border-[var(--public-border)] bg-[var(--public-surface)] px-4 py-5 transition hover:border-[#6aab48]">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-2xl font-extrabold">{route.name}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--public-muted)]" aria-hidden="true" />
                  </div>
                  <span className="mt-2 text-xs leading-5 text-[var(--public-muted)]">{route.destination ?? "Recorrido local"}</span>
                  <span className="mt-auto pt-4 text-xs font-bold text-[var(--public-accent)]">Horario y recorrido</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={`scroll-mt-24 border-b border-white/15 ${DEFERRED_SECTION}`}>
        <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 lg:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#b8e840]">Tu primer viaje</p>
              <h2 className="mt-2 text-3xl font-extrabold">Del origen a tu destino.</h2>
            </div>
            <Link href="/guia" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#b8e840]">Ver la guía<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <ol className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.n} className="border-t border-white/25 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#a8b5a1]">{step.n}</span>
                    <Icon className="h-5 w-5 text-[#b8e840]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#a8b5a1]">{step.desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className={DEFERRED_SECTION}>
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20 lg:py-16">
          <div>
            <p className="text-xs font-bold uppercase text-[#a8b5a1]">Antes de salir</p>
            <h2 className="mt-2 text-3xl font-extrabold">¿Alguna duda?</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#a8b5a1]">Tarifas, horarios y lo que necesitas saber para moverte por Uruapan.</p>
          </div>
          <div className="border-t border-white/20">
            {LANDING_FAQS.slice(0, 4).map((item) => (
              <details key={item.question} className="group border-b border-white/20">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Plus className="h-5 w-5 shrink-0 text-[#b8e840] transition group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-5 text-sm leading-6 text-[#b6c1af]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/15 bg-[#172012]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-bold text-[#b8e840]"><Users className="h-4 w-4" aria-hidden="true" />Hecho aquí, mejorado entre todos.</p>
            <p className="mt-2 text-sm leading-6 text-[#b6c1af]">Las rutas cambian. Tus reportes nos ayudan a revisar recorridos y mantener la información al día.</p>
          </div>
          <Link href="/acerca-de" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold">Conoce el proyecto<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

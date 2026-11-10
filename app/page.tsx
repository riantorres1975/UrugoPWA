import type { Metadata } from "next";
import Link from "next/link";
import SiteBrand from "@/components/SiteBrand";
import { ArrowRight, BusFront, CableCar, Clock3, Map, Plus } from "lucide-react";
import LandingAtlas from "@/components/LandingAtlas";
import LandingDestinations, { type LandingDestination } from "@/components/LandingDestinations";
import { LandingJourneyDemo, LandingPersonalDay } from "@/components/LandingDeferred";
import PublicMobileMenu from "@/components/PublicMobileMenu";
import LandingHeroPlanner from "@/components/LandingHeroPlanner";
import LandingReports from "@/components/LandingReports";
import LandingRanking from "@/components/LandingRanking";
import ForceDark from "@/components/ForceDark";
import FareUpdateNotice from "@/components/FareUpdateNotice";
import PublicFooter from "@/components/PublicFooter";
import {
  APP_BRAND,
  FARES_2026,
  LANDING_FAQS,
  TELEFERICO_URUAPAN,
} from "@/lib/mobility-config";
import { getPlaceSeoItems, getRoutesNearPlace, walkMinutesFor } from "@/lib/como-llegar";
import { PROJECT, PROJECT_SOCIAL_PROFILES } from "@/lib/project";
import { getPopularRoutes } from "@/lib/route-popularity";
import { getTripActivity } from "@/lib/trip-activity-server";
import { SITE_URL } from "@/lib/site-url";

import "./landing.css";

const URBAN_FARE_DISPLAY = FARES_2026.urbanBus.price.replace(/\.00$/, "");
const TELEFERICO_FARE_DISPLAY = FARES_2026.teleferico.price.replace(/\.00$/, "");

const navigation = [
  { href: "/rutas", label: "Rutas" },
  { href: "/horarios", label: "Horarios" },
  { href: "#destinos", label: "Destinos" },
  { href: "#tu-dia", label: "Tu día" },
  { href: "#como-funciona", label: "Guía" },
] as const;

const featured = [
  ["Centro Histórico", "paseo"],
  ["Hospital Regional", "salud"],
  ["Central de Autobuses", "conexiones"],
  ["Mercado Poniente", "conexiones"],
  ["Parque Lineal Cupatitzio", "paseo"],
  ["Hospital Civil", "salud"],
  ["IMSS Hospital General de Zona 8", "salud"],
  ["Presidencia Municipal", "paseo"],
  ["Unidad Deportiva", "paseo"],
] as const;

const allSeoPlaces = getPlaceSeoItems();
const featuredPlaces: LandingDestination[] = featured.flatMap(([label, category]) => {
  const place = allSeoPlaces.find((item) => item.label === label);
  if (!place) return [];
  const routes = getRoutesNearPlace(place.center);
  if (!routes.length) return [];
  return [{
    slug: place.slug,
    label: place.label,
    category,
    routeCount: routes.length,
    nearestWalkMin: walkMinutesFor(routes[0].distanceM),
  }];
});

function mapHref(label: string) {
  const place = allSeoPlaces.find((item) => item.label === label);
  const params = new URLSearchParams({ destino: label });
  if (place) params.set("b", place.center.join(","));
  return `/mapa?${params}`;
}

const services = [
  { href: "/rutas", icon: BusFront, title: "Camión urbano", detail: `40 rutas · ${URBAN_FARE_DISPLAY} · Efectivo` },
  { href: "/teleferico-uruapan-horario", icon: CableCar, title: "Teleférico Uruapan", detail: `${TELEFERICO_URUAPAN.stations.length} estaciones · ${TELEFERICO_FARE_DISPLAY} · Tarjeta` },
  { href: "/horarios", icon: Clock3, title: "Horarios y tarifas", detail: "Consulta antes de salir" },
] as const;

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

export const revalidate = 300;

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

export default async function LandingPage() {
  const [{ basedOnUsage, routes: popularRoutes }, activity] = await Promise.all([getPopularRoutes(4), getTripActivity()]);

  return (
    <div className="premium-home landing-home" data-theme="dark">
      <ForceDark />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <a className="skip" href="#principal">Saltar al contenido</a>
      <header className="top night">
        <div className="wrap">
          <SiteBrand />
          <nav className="desktop-nav" aria-label="Navegación principal">
            {navigation.map(({ href, label }) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <div className="nav-right">
            <Link className="action" href="/mapa"><Map className="icon" aria-hidden="true" /> Abrir mapa</Link>
            <PublicMobileMenu items={navigation} className="home-menu" />
          </div>
        </div>
      </header>
      <FareUpdateNotice />
      <main id="principal" tabIndex={-1}>
        <section className="hero night" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="city micro"><i aria-hidden="true" /> Uruapan, Michoacán</p>
              <h1 id="hero-title">Muévete por <em>Uruapan.</em></h1>
              <p className="lede">Encuentra qué camión tomar, cuándo salir y cómo combinar tu viaje con el Teleférico.</p>
              <LandingHeroPlanner centerHref={mapHref("Centro Histórico")} hospitalHref={mapHref("Hospital Regional")} />
              <p className="privacy">Gratis y sin cuenta. Hecho en Uruapan.</p>
            </div>
            <LandingAtlas />
          </div>
        </section>

        <section id="transporte" className="service night" aria-label="Opciones de transporte">
          <div className="wrap service-grid">
            {services.map(({ href, icon: Icon, title, detail }) => (
              <Link key={href} href={href}>
                <span className="home-row"><Icon className="icon" aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span></span>
                <ArrowRight className="icon" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <div className="wrap section everyday">
          <LandingDestinations places={featuredPlaces} />
          <LandingPersonalDay />
        </div>

        <section id="como-funciona" className="section trip night home-anchor" aria-labelledby="trip-title">
          <div className="wrap trip-grid">
            <div>
              <p className="micro label">02 / Modo viaje</p>
              <h2 id="trip-title">De aquí a allá, <em>paso a paso.</em></h2>
              <p className="intro">Ubica dónde subir, dónde bajar y cómo hacer un transbordo si tu ruta lo necesita.</p>
              <Link className="action home-outline" href="/guia">Ver guía de viaje <ArrowRight className="icon" aria-hidden="true" /></Link>
            </div>
            <LandingJourneyDemo />
          </div>
        </section>

        <section className="community" aria-label="Comunidad de UruGo">
          <div className="wrap community-grid">
            <LandingRanking activity={activity} basedOnUsage={basedOnUsage} routes={popularRoutes.map(({ slug, name, destination }) => ({ slug, name, destination }))} />
            <LandingReports />
          </div>
        </section>

        <section className="wrap section faq" aria-labelledby="faq-title">
          <div>
            <p className="micro label">04 / Antes de salir</p>
            <h2 id="faq-title">Preguntas <em>frecuentes.</em></h2>
            <p className="intro">Respuestas rápidas para planear tu siguiente viaje.</p>
          </div>
          <div className="faq-list">
            {[LANDING_FAQS[2], LANDING_FAQS[0], LANDING_FAQS[3], LANDING_FAQS[5]].map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}<Plus className="icon" aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

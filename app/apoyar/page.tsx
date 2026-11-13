import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cloud, Code2, Heart, MapPinned, MessageSquareWarning, Wrench } from "lucide-react";
import ForceDark from "@/components/ForceDark";
import PublicFooter from "@/components/PublicFooter";
import PublicHeader from "@/components/PublicHeader";
import SupportClaimForm from "@/components/SupportClaimForm";
import SupportPaymentOptions from "@/components/SupportPaymentOptions";
import SupportWall from "@/components/SupportWall";
import { getSupportWall } from "@/lib/support-contributions-server";
import type { SupportMethod } from "@/lib/support-contributions";
import { PROJECT } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";
import { getSupportOptions } from "@/lib/support";
import "../support.css";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Apoyar UruGo",
  description: "Ayuda a mantener el mapa de rutas de Uruapan. Apoya de forma voluntaria y elige cómo aparecer en la comunidad.",
  alternates: { canonical: `${SITE_URL}/apoyar` },
  openGraph: { title: "Apoyar UruGo", description: "Un pequeño apoyo para que más personas sigan llegando.", url: `${SITE_URL}/apoyar`, type: "website" },
};

const uses = [
  { icon: Cloud, title: "Seguir disponibles", text: "Dominio, alojamiento y servicios que mantienen el mapa en funcionamiento." },
  { icon: MapPinned, title: "Cuidar los recorridos", text: "Herramientas para revisar cambios de rutas, horarios y referencias de Uruapan." },
  { icon: Wrench, title: "Mejorar cada viaje", text: "Correcciones y mejoras para una aplicación más sencilla y accesible." },
];

export default async function SupportPage() {
  const options = getSupportOptions();
  const data = await getSupportWall();
  const methods: SupportMethod[] = [...(options.mercadoPagoUrl ? ["mercadopago" as const] : []), "paypal", ...(options.spei ? ["spei" as const] : [])];
  return <main className="public-page support-page">
    <ForceDark /><PublicHeader />
    <div className="support-shell">
      <section className="support-hero" aria-labelledby="support-title">
        <div className="support-hero-copy"><p className="support-eyebrow"><Heart aria-hidden="true" /> Independiente. Local. En comunidad.</p>
          <h1 id="support-title" className="public-page-title">Tú llegas.<br /><em>UruGo sigue.</em></h1>
          <p className="support-intro">Un pequeño apoyo para que más personas encuentren su camino por Uruapan.</p>
          <p>Si el mapa te ha ayudado, puedes aportar a su mantenimiento. Tú eliges el monto y si quieres que tu apoyo sea público.</p>
          <a className="support-link" href="#formas-de-apoyar">Quiero apoyar <ArrowRight aria-hidden="true" /></a>
          <div className="support-route-art" aria-hidden="true"><span>A</span><svg viewBox="0 0 360 76" fill="none"><path className="support-route-base" d="M0 60H75Q95 60 95 40V28Q95 10 115 10H220Q240 10 240 30V42Q240 60 260 60H360" /><path className="support-route-flow" d="M0 60H75Q95 60 95 40V28Q95 10 115 10H220Q240 10 240 30V42Q240 60 260 60H360" /></svg><span><Heart /></span></div>
          <small>El mapa sigue abierto para todos. Apoyar siempre es opcional.</small>
        </div>
        <div id="formas-de-apoyar"><SupportPaymentOptions options={options} /></div>
      </section>
      <section className="support-purpose" aria-labelledby="support-purpose-title"><div className="support-purpose-heading"><p className="support-eyebrow">En qué ayuda tu aporte</p><h2 id="support-purpose-title">Detrás de cada llegada,<br />hay un mapa que cuidar.</h2></div>
        <div className="support-uses">{uses.map(({ icon: Icon, title, text }, i) => <article key={title}><span className="support-use-number">0{i + 1}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <SupportWall data={data} />
      <SupportClaimForm methods={methods} />
      <section className="support-other" aria-labelledby="support-other-title"><div><p className="support-eyebrow">Cada ayuda cuenta</p><h2 id="support-other-title">También puedes apoyar<br />sin dinero.</h2></div><div>
        <Link href="/reportar-error"><MessageSquareWarning aria-hidden="true" /><span><strong>Reporta un cambio</strong><small>Tu experiencia ayuda a mejorar las rutas.</small></span><ArrowRight aria-hidden="true" /></Link>
        <a href={PROJECT.repositoryUrl} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" /><span><strong>Contribuye al proyecto</strong><small>Consulta el código y las mejoras pendientes.</small></span><ArrowRight aria-hidden="true" /></a>
      </div></section>
    </div><PublicFooter />
  </main>;
}

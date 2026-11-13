import Link from "next/link";
import { ArrowUpRight, Heart, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import SupporterList from "@/components/SupporterList";
import SupportGoal from "@/components/SupportGoal";
import { formatSupportAmount, type SupportWallData } from "@/lib/support-contributions";

export default function SupportWall({ data, compact = false }: { data: SupportWallData | null; compact?: boolean }) {
  const supporters = data?.supporters.slice(0, compact ? 4 : 8) ?? [];
  return <section className={`support-wall${compact ? " support-wall-compact" : ""}`} aria-label="Aportaciones de la comunidad">
    <div className="support-wall-heading"><div><p className="support-eyebrow"><Heart aria-hidden="true" /> Hecho posible en comunidad</p>
      <h2>Gracias por mantener<br className="hidden sm:block" /> el mapa en movimiento.</h2>
      <p>{supporters.length ? "Estos son los apoyos que el equipo ya verificó. Cada persona elige cómo aparecer." : "Aquí reconoceremos los apoyos verificados de la comunidad. Tú eliges si quieres aparecer."}</p></div>
      {compact && <Link href="/apoyar" className="support-link">Apoyar UruGo <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </div>
    {data?.goal && <SupportGoal goal={data.goal} />}
    {supporters.length > 0 ? <><SupporterList>{supporters.map((supporter, index) => <li key={supporter.id} style={{ "--supporter-delay": `${index * 90}ms` } as CSSProperties}>
      <span className="supporter-avatar" aria-hidden="true">{supporter.name === "Apoyo anónimo" ? <Heart /> : Array.from(supporter.name)[0]?.toUpperCase()}</span>
      <div><strong className="supporter-name"><span className="supporter-name-text">{supporter.name}</span><span className="supporter-thanks" aria-hidden="true"><Heart /></span></strong><small>Confirmado el {new Date(supporter.confirmed_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" })}</small></div>
      {supporter.amount_cents !== null && <span className="supporter-amount">{formatSupportAmount(supporter.amount_cents)} <small>MXN</small></span>}
    </li>)}</SupporterList><p className="support-wall-caption"><ShieldCheck aria-hidden="true" /> {data!.confirmedCount} {data!.confirmedCount === 1 ? "aportación pública confirmada" : "aportaciones públicas confirmadas"}. Los montos se muestran solo con autorización.</p></>
      : <div className="support-first"><span className="support-first-heart" aria-hidden="true"><Heart /></span><div>
        <h3>{data?.confirmedCount === 0 ? "El primer apoyo puede ser el tuyo." : "Tu apoyo también puede hacer la diferencia."}</h3>
        <p>{data?.confirmedCount === 0 ? "Aún no hay aportaciones públicas confirmadas. Si UruGo te ayuda a llegar, puedes ayudar a que siga disponible para todos." : "El reconocimiento de apoyos no está disponible por el momento. Puedes consultar las formas de apoyo y elegir aparecer con tu nombre o como anónimo."}</p>
        <Link href={compact ? "/apoyar" : "#formas-de-apoyar"} className="support-link">{data?.confirmedCount === 0 ? "Quiero ser el primer apoyo" : "Ver formas de apoyo"} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div></div>}
  </section>;
}

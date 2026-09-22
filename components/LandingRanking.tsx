import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BusFront } from "lucide-react";
import type { TripActivitySummary } from "@/lib/trip-activity";
import LandingActivityReveal from "@/components/LandingActivityReveal";

type RankedRoute = { slug: string; name: string; destination: string | null };

export default function LandingRanking({ routes, basedOnUsage, activity }: { routes: RankedRoute[]; basedOnUsage: boolean; activity?: TripActivitySummary | null }) {
  const useTrips = !!activity && activity.weeklyTrips >= 10 && activity.routes.length >= 4;
  const displayedRoutes = useTrips ? activity.routes : routes;
  const maxTrips = Math.max(1, ...(activity?.routes.map((route) => route.started) ?? []));
  const updatedLabel = activity ? new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  }).format(new Date(activity.updatedAt)) : null;

  return (
    <LandingActivityReveal>
      <div className="activity-intro">
        <div>
          <p className="ranking-eyebrow">Los viajes de nuestra comunidad</p>
          <h2 id="activity-title">Así se mueve Uruapan</h2>
          <p>Un viaje a la vez, conocemos mejor cómo nos movemos.</p>
        </div>
        <div className="activity-track" aria-hidden="true"><span /><i /><i /><i /><b><BusFront size={23} /></b></div>
      </div>
      {activity ? (
        <>
          <dl className="activity-totals" aria-label={`Actividad del ${activity.day}`}>
            {([
              ["Viajes iniciados", activity.today.started],
              ["Llegadas confirmadas", activity.today.arrived],
              ["Rutas en los viajes", activity.today.routes],
            ] as const).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd key={value}>{value.toLocaleString("es-MX")}</dd></div>
            ))}
          </dl>
          <p className="activity-updated">Actividad del {activity.day} · Actualizado {updatedLabel} · Hora de Uruapan</p>
        </>
      ) : null}
      <div className="ranking-heading">
        <div>
          <h3 id="ranking-title">{useTrips ? "Rutas con más viajes iniciados" : basedOnUsage ? "Rutas más consultadas" : "Rutas para empezar"}</h3>
          <p className="ranking-period">{useTrips ? "Últimos 7 días · Inicios del modo viaje en UruGo" : basedOnUsage ? "Últimos 30 días · Consultas en el mapa y en las rutas" : "Selección inicial mientras reunimos actividad"}</p>
          {!useTrips ? <p className="ranking-period">Estamos reuniendo viajes para mostrar la actividad semanal.</p> : null}
        </div>
        <Link href="/rutas" className="ranking-all">Ver las 40 rutas <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ol className="ranking-list">
        {displayedRoutes.map((route, index) => (
          <li key={route.slug} style={{ "--rank-delay": `${index * 90}ms` } as CSSProperties}>
            <Link href={`/ruta/${route.slug}`} className="ranking-route">
              <span className="ranking-number" aria-label={useTrips || basedOnUsage ? `Posición ${index + 1}` : undefined}>{String(index + 1).padStart(2, "0")}</span>
              <span className="ranking-route-body">
                <span className="ranking-route-kind"><BusFront size={15} aria-hidden="true" /> {route.slug === "teleferico-uruapan" ? "Teleférico" : "Camión urbano"}</span>
                <strong>{route.name}</strong>
                <span className="ranking-destination">{route.destination ?? "Recorrido local"}</span>
                {useTrips && "started" in route && "previous" in route ? (
                  <div className="activity-route-count">
                    <span>{Number(route.started).toLocaleString("es-MX")} viajes iniciados</span>
                    <div className="activity-bar" aria-hidden="true"><i style={{ "--activity-width": `${Number(route.started) / maxTrips * 100}%` } as CSSProperties} /></div>
                    {Number(route.previous) >= 5 && Number(route.started) > Number(route.previous) ? (
                      <small>↑ {Number(route.started) - Number(route.previous)} más que los 7 días anteriores</small>
                    ) : null}
                  </div>
                ) : null}
                <span className="ranking-route-action">Horario y recorrido <ArrowUpRight size={17} aria-hidden="true" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {activity?.transfers.length ? (
        <div className="activity-transfers">
          <h3>Transbordos mejor valorados</h3>
          <p className="ranking-period">Opiniones de los últimos 30 días · Al menos 10 respuestas de 5 participantes</p>
          <ul>{activity.transfers.map((transfer) => (
            <li key={transfer.names.join("→")}>
              <strong>{transfer.names.join(" → ")}</strong>
              <span>{Math.round(100 * transfer.positive / transfer.total)}% lo encontró útil · {transfer.total} respuestas</span>
            </li>
          ))}</ul>
        </div>
      ) : null}
      <p className="activity-note">Los inicios indican que alguien activó el modo viaje. Las llegadas se cuentan cuando la persona las confirma. Un viaje con transbordo aporta actividad a ambas rutas.</p>
    </LandingActivityReveal>
  );
}

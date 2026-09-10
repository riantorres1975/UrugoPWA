"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BusFront } from "lucide-react";

type RankedRoute = { slug: string; name: string; destination: string | null };

export default function LandingRanking({ routes, basedOnUsage }: { routes: RankedRoute[]; basedOnUsage: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="landing-ranking" data-revealed={revealed} aria-labelledby="ranking-title">
      <div className="ranking-heading">
        <div>
          <p className="ranking-eyebrow">{basedOnUsage ? "Lo que consulta Uruapan" : "Explora la ciudad"}</p>
          <h3 id="ranking-title">{basedOnUsage ? "Rutas más consultadas" : "Rutas para empezar"}</h3>
          <p className="ranking-period">{basedOnUsage ? "Últimos 30 días · Consultas en el mapa y en las rutas" : "Selección inicial mientras reunimos actividad"}</p>
        </div>
        <Link href="/rutas" className="ranking-all">Ver las 40 rutas <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ol className="ranking-list">
        {routes.map((route, index) => (
          <li key={route.slug} style={{ "--rank-delay": `${index * 90}ms` } as CSSProperties}>
            <Link href={`/ruta/${route.slug}`} className="ranking-route">
              <span className="ranking-number" aria-label={basedOnUsage ? `Posición ${index + 1}` : undefined}>{String(index + 1).padStart(2, "0")}</span>
              <span className="ranking-route-body">
                <span className="ranking-route-kind"><BusFront size={15} aria-hidden="true" /> Camión urbano</span>
                <strong>{route.name}</strong>
                <span className="ranking-destination">{route.destination ?? "Recorrido local"}</span>
                <span className="ranking-route-action">Horario y recorrido <ArrowUpRight size={17} aria-hidden="true" /></span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

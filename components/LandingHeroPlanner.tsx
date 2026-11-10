"use client";
import Link from "next/link";
import { LocateFixed } from "lucide-react";
import LandingSearch from "@/components/LandingSearch";
import { rememberNearbyRoutesRequest } from "@/lib/nearby-request";

export default function LandingHeroPlanner({ centerHref, hospitalHref }: { centerHref: string; hospitalHref: string }) {
  return (
    <>
      <LandingSearch />
      <div className="quick" aria-label="Accesos rápidos">
        <Link className="pill" href="/mapa?cerca=1" onClick={rememberNearbyRoutesRequest}>
          <LocateFixed className="icon" aria-hidden="true" /> Rutas cerca de mí
        </Link>
        <Link className="pill" href={centerHref}>Centro</Link>
        <Link className="pill" href={hospitalHref}>Hospital Regional</Link>
      </div>
    </>
  );
}

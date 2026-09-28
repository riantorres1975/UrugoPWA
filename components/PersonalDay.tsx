"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavoriteRoutes } from "@/hooks/useFavoriteRoutes";
import { getRecentTrips, RECENT_TRIPS_EVENT, type RecentTrip } from "@/lib/recent-trips";
import { getSavedPlaces, SAVED_SLOT_LABELS } from "@/lib/saved-places";
import { readSavedTrip } from "@/lib/trip-storage";
import { tripHref } from "@/lib/trip-links";
import FavoriteNotices from "@/components/FavoriteNotices";
import ReportHistory from "@/components/ReportHistory";

export default function PersonalDay() {
  const { favorites } = useFavoriteRoutes();
  const [trips, setTrips] = useState<RecentTrip[]>([]);
  const [places, setPlaces] = useState<ReturnType<typeof getSavedPlaces>>({});
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      setTrips(getRecentTrips()); setPlaces(getSavedPlaces());
      void readSavedTrip().then((saved) => { if (mounted) setPending(!!saved); });
    };
    refresh();
    window.addEventListener("storage", refresh); window.addEventListener("focus", refresh);
    window.addEventListener(RECENT_TRIPS_EVENT, refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); window.removeEventListener(RECENT_TRIPS_EVENT, refresh); };
  }, []);
  const link = "inline-flex min-h-11 items-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:border-lima focus-visible:outline-lima";
  const returning = pending || trips.length > 0 || favorites.size > 0 || Object.keys(places).length > 0;
  return <section id="tu-dia" className="scroll-mt-24 mt-5 rounded-xl border border-white/15 bg-[#171e14] p-4" aria-label="Tu día">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-bold">Tu día</h2><span className="text-xs text-[#b6c1af]">Guardado en este dispositivo</span></div>
    {pending && <Link href="/mapa" prefetch={false} className={`${link} mt-3 bg-lima text-[#14200c]`}>Continuar viaje pendiente →</Link>}
    {!returning && <p className="mt-2 text-sm text-[#b6c1af]">Tus destinos recientes y rutas favoritas aparecerán aquí. Guarda una ruta con la estrella del mapa.</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {(["casa", "trabajo"] as const).map((slot) => places[slot] ? <Link key={slot} className={link} prefetch={false} href={`/mapa?${new URLSearchParams({ b: places[slot]!.center.join(","), destino: places[slot]!.label })}`}>{SAVED_SLOT_LABELS[slot]} →</Link> : null)}
      {[...favorites].slice(0, 4).map((name) => <Link key={name} className={link} prefetch={false} href={`/mapa?r=${encodeURIComponent(name)}`}>★ {name}</Link>)}
    </div>
    {trips.length > 0 && <ul className="mt-3 divide-y divide-white/15">{trips.map((trip) => <li key={trip.savedAt} className="flex flex-wrap items-center justify-between gap-x-3 py-2">
      <Link className={`${link} flex-1 border-transparent`} href={tripHref(trip.origin, trip.destination, trip.destinationLabel)} prefetch={false}>{trip.destinationLabel || "Último destino"} →</Link>
      <Link className={`${link} text-lima`} href={tripHref(trip.destination, trip.origin)} prefetch={false} aria-label={`Planear regreso desde ${trip.destinationLabel || "último destino"}`}>Regreso</Link>
    </li>)}</ul>}
    <FavoriteNotices names={[...favorites].slice(0, 4)} />
    <ReportHistory />
  </section>;
}

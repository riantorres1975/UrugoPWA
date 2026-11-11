"use client";
import Link from "next/link";
import { Bookmark, Clock3, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useFavoriteRoutes } from "@/hooks/useFavoriteRoutes";
import { getRecentTrips, RECENT_TRIPS_EVENT, type RecentTrip } from "@/lib/recent-trips";
import { getSavedPlaces, SAVED_SLOT_LABELS } from "@/lib/saved-places";
import { readSavedTrip } from "@/lib/trip-storage";
import { tripHref } from "@/lib/trip-links";
import FavoriteNotices from "@/components/FavoriteNotices";
import ReportHistory from "@/components/ReportHistory";
import { OFFLINE_JOURNEYS_EVENT, readOfflineJourneys } from "@/lib/offline-journey-storage";

export default function PersonalDay({ onPersonalizedChange }: { onPersonalizedChange?: (personalized: boolean) => void }) {
  const { favorites } = useFavoriteRoutes();
  const [trips, setTrips] = useState<RecentTrip[]>([]);
  const [places, setPlaces] = useState<ReturnType<typeof getSavedPlaces>>({});
  const [pending, setPending] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      setTrips(getRecentTrips()); setPlaces(getSavedPlaces());
      setOfflineCount(readOfflineJourneys().length);
      void readSavedTrip().then((saved) => { if (mounted) setPending(!!saved); });
    };
    refresh();
    window.addEventListener("storage", refresh); window.addEventListener("focus", refresh);
    window.addEventListener(RECENT_TRIPS_EVENT, refresh);
    window.addEventListener(OFFLINE_JOURNEYS_EVENT, refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener("storage", refresh); window.removeEventListener("focus", refresh); window.removeEventListener(RECENT_TRIPS_EVENT, refresh); window.removeEventListener(OFFLINE_JOURNEYS_EVENT, refresh); };
  }, []);
  const hasFavorites = favorites.size > 0 || Boolean(places.casa || places.trabajo);
  const personalized = hasFavorites || trips.length > 0 || pending || offlineCount > 0;
  useEffect(() => { onPersonalizedChange?.(personalized); }, [onPersonalizedChange, personalized]);

  return (
    <section id="tu-dia" className="daily" data-personalized={personalized} aria-labelledby="daily-title">
      <p className="micro label">Tu espacio personal</p>
      <h2 id="daily-title">Tu día</h2>
      <p>Accede a tus viajes y destinos guardados en este dispositivo.</p>
      {pending && <Link href="/mapa" prefetch={false} className="action dark mt-3">Continuar viaje pendiente →</Link>}
      <Link href="/mapa?guardados=1" prefetch={false} className="daily-link mt-3 flex items-center gap-2">
        <WifiOff className="icon" aria-hidden="true" /> Viajes sin conexión{offlineCount > 0 ? ` (${offlineCount})` : ""}
      </Link>
      <details className="daily-disclosure" open={hasFavorites || undefined}>
        <summary><Bookmark className="icon" aria-hidden="true" /> Lugares y rutas favoritas</summary>
        {hasFavorites ? (
          <div className="daily-items">
            {(["casa", "trabajo"] as const).map((slot) => {
              const place = places[slot];
              return place && (
                <Link key={slot} className="daily-link" prefetch={false}
                  href={`/mapa?${new URLSearchParams({ b: place.center.join(","), destino: place.label })}`}>
                  {SAVED_SLOT_LABELS[slot]} →
                </Link>
              );
            })}
            {[...favorites].slice(0, 4).map((name) => (
              <Link key={name} className="daily-link" prefetch={false} href={`/mapa?r=${encodeURIComponent(name)}`}>★ {name}</Link>
            ))}
          </div>
        ) : (
          <>
            <p>Marca una ruta con la estrella en el mapa para tenerla a mano.</p>
            <Link className="text-link" href="/rutas">Explorar rutas →</Link>
          </>
        )}
        <FavoriteNotices names={[...favorites].slice(0, 4)} />
      </details>
      <details className="daily-disclosure" open={trips.length > 0 || undefined}>
        <summary><Clock3 className="icon" aria-hidden="true" /> Viajes recientes</summary>
        {trips.length > 0 ? (
          <ul>
            {trips.map((trip) => (
              <li key={trip.savedAt} className="daily-trip">
                <Link className="daily-link" href={tripHref(trip.origin, trip.destination, trip.destinationLabel)} prefetch={false}>
                  {trip.destinationLabel || "Último destino"} →
                </Link>
                <Link className="daily-link" href={tripHref(trip.destination, trip.origin)} prefetch={false}
                  aria-label={`Planear regreso desde ${trip.destinationLabel || "último destino"}`}>
                  Regreso
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p>Cuando planees un viaje, podrás retomarlo desde aquí.</p>
            <Link className="text-link" href="/mapa">Planear un viaje →</Link>
          </>
        )}
      </details>
      <ReportHistory />
    </section>
  );
}

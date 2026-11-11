"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileDown, Trash2, WifiOff } from "lucide-react";
import { OFFLINE_JOURNEYS_EVENT, readOfflineJourneys, removeOfflineJourney, type OfflineJourney } from "@/lib/offline-journey-storage";

export default function SavedJourneys() {
  const [journeys, setJourneys] = useState<OfflineJourney[]>([]);
  const [selected, setSelected] = useState<OfflineJourney | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => setJourneys(readOfflineJourneys());
    refresh();
    window.addEventListener(OFFLINE_JOURNEYS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(OFFLINE_JOURNEYS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  if (selected) return (
    <div className="space-y-3">
      <button type="button" onClick={() => setSelected(null)} className="ov-text inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a mis viajes
      </button>
      <iframe title={selected.title} sandbox="" className="h-[62dvh] w-full rounded-xl border-0 bg-white"
        srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">${selected.html}`} />
    </div>
  );
  return (
    <section aria-label="Viajes guardados sin conexión" className="space-y-4">
      <p className="ov-text-muted flex items-start gap-2 text-sm leading-6">
        <WifiOff className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        Consulta tus indicaciones y el esquema del recorrido, incluso sin internet. Revisa la fecha antes de viajar.
      </p>
      {journeys.length ? (
        <ul className="space-y-3">{journeys.map((journey) => (
          <li key={journey.id} className="ov-pill ov-border rounded-xl border p-3">
            <button type="button" onClick={() => setSelected(journey)} className="ov-text min-h-11 w-full text-left text-sm font-semibold">
              {journey.title}
              <span className="ov-text-muted mt-1 block text-xs font-normal">Guardado el {new Date(journey.savedAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City", dateStyle: "medium", timeStyle: "short" })}</span>
            </button>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setSelected(journey)} className="map-primary min-h-11 rounded-lg px-3 text-sm font-bold">Ver indicaciones</button>
              <a href={`data:text/html;charset=utf-8,${encodeURIComponent(journey.html)}`} download="urugo-mi-viaje.html"
                className="ov-text inline-flex min-h-11 items-center gap-2 px-2 text-xs"><FileDown className="h-4 w-4" aria-hidden="true" /> Descargar</a>
              <button type="button" aria-label={`Quitar viaje ${journey.title}`} onClick={() => {
                try { removeOfflineJourney(journey.id); setError(""); }
                catch { setError("No pudimos quitar el viaje. Intenta de nuevo."); }
              }} className="ov-text-muted inline-flex min-h-11 items-center gap-2 px-2 text-xs"><Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar</button>
            </div>
          </li>
        ))}</ul>
      ) : <p className="ov-text rounded-xl border border-dashed border-current/25 p-5 text-sm leading-6">Aún no tienes viajes guardados. Planea un viaje y toca «Guardar en la app» en sus detalles.</p>}
      {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    </section>
  );
}

"use client";
import { useState } from "react";
import { getTripJourneyKey } from "@/lib/trip-mode";
import { saveOfflineJourney } from "@/lib/offline-journey-storage";
import type { TripJourney } from "@/lib/trip-mode";

export default function JourneyTools({ journey, destinationLabel, onReturn, onOpenSaved, temporary }: {
  journey: TripJourney;
  destinationLabel?: string | null;
  onReturn: () => void;
  onOpenSaved: () => void;
  temporary: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const { offlineJourneyHtml } = await import("@/lib/offline-journey");
      const names = journey.kind === "direct" ? [journey.routeName] : [journey.routeAName, journey.routeBName];
      const origin = journey.origin ?? (journey.kind === "direct" ? journey.segment[0] : journey.segmentA[0]);
      const title = destinationLabel ? `${destinationLabel} · ${names.join(" → ")}` : names.join(" → ");
      saveOfflineJourney({ id: `${getTripJourneyKey(journey)}:${origin.join(",")}`, title, html: offlineJourneyHtml(journey) });
      setMessage("Viaje guardado en este dispositivo. Encuéntralo en «Viajes sin conexión».");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos guardar el viaje. Intenta de nuevo.");
    } finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setMessage("");
    try {
      const { offlineJourneyHtml } = await import("@/lib/offline-journey");
      const url = URL.createObjectURL(new Blob([offlineJourneyHtml(journey)], { type: "text/html;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "urugo-mi-viaje.html";
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Ficha preparada. Ábrela desde Descargas, incluso sin internet.");
    } catch { setMessage("No pudimos preparar la ficha. Intenta de nuevo."); }
    finally { setBusy(false); }
  }
  return <section className="ov-border border-t px-4 py-3" aria-label="Preparar este viaje">
    <div className="grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={onReturn} className="ov-border ov-text min-h-11 rounded-xl border px-3 text-sm font-semibold">Planear regreso</button>
      <button type="button" onClick={() => void save()} disabled={busy || temporary} className="map-primary min-h-11 rounded-xl px-3 text-sm font-bold disabled:opacity-50">{busy ? "Preparando…" : "Guardar en la app"}</button>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => void download()} disabled={busy || temporary} className="ov-border ov-text min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">{busy ? "Preparando…" : "Guardar ficha sin conexión"}</button>
      <button type="button" onClick={onOpenSaved} className="ov-text inline-flex min-h-11 items-center px-2 text-sm underline">Mis viajes guardados</button>
    </div>
    <p className="ov-text-muted mt-2 text-xs leading-5">El regreso se calcula de nuevo. La ficha guarda indicaciones y un esquema; no incluye navegación GPS ni mapa de calles.</p>
    {temporary && <p className="ov-text-muted mt-1 text-xs">Para guardar la ficha, elige los puntos directamente en el mapa o usa lugares del catálogo local.</p>}
    <p role="status" className="ov-text mt-1 text-xs">{message}</p>
  </section>;
}

"use client";
import { useState } from "react";
import type { TripJourney } from "@/lib/trip-mode";

export default function JourneyTools({ journey, onReturn, temporary }: { journey: TripJourney; onReturn: () => void; temporary: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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
      <button type="button" onClick={() => void download()} disabled={busy || temporary} className="ov-border ov-text min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50">{busy ? "Preparando…" : "Guardar ficha sin conexión"}</button>
    </div>
    <p className="ov-text-muted mt-2 text-xs leading-5">El regreso se calcula de nuevo. La ficha guarda indicaciones y un esquema; no incluye navegación GPS ni mapa de calles.</p>
    {temporary && <p className="ov-text-muted mt-1 text-xs">Para guardar la ficha, elige los puntos directamente en el mapa o usa lugares del catálogo local.</p>}
    <p role="status" className="ov-text mt-1 text-xs">{message}</p>
  </section>;
}

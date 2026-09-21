import type { TripJourney } from "@/lib/trip-mode";

export default function TripRecoveryPanel({ journey, busy, error, onResume, onDiscard }: {
  journey: TripJourney;
  busy: boolean;
  error: string | null;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <section aria-label="Recuperar viaje" className="ov-panel ov-border absolute inset-x-3 bottom-24 z-[60] max-h-[60dvh] overflow-y-auto rounded-2xl border p-4 shadow-xl sm:mx-auto sm:max-w-md">
      <p className="ov-text font-bold">Tienes un viaje pendiente</p>
      <p className="ov-text-muted mt-1 text-sm">{journey.kind === "direct" ? journey.routeName : `${journey.routeAName} → ${journey.routeBName}`}</p>
      <p className="ov-text-muted mt-2 text-xs">Actualizaremos tu ubicación antes de continuar. Se guarda solo en este dispositivo durante 6 horas.</p>
      {error ? <p role="alert" className="mt-2 text-sm text-amber-300">{error}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={onResume} className="min-h-11 rounded-xl bg-lima px-3 text-sm font-bold text-ink-900 disabled:opacity-50">{busy ? "Actualizando GPS…" : "Continuar viaje"}</button>
        <button type="button" disabled={busy} onClick={onDiscard} className="ov-pill ov-border ov-text min-h-11 rounded-xl border px-3 text-sm font-semibold">Finalizar pendiente</button>
      </div>
    </section>
  );
}

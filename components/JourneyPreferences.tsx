"use client";
import type { JourneyPreference } from "@/lib/journey-ranking";
export default function JourneyPreferences({ value, onChange, disabled }: { value: JourneyPreference; onChange: (value: JourneyPreference) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="ov-border border-b px-4 py-3 disabled:opacity-50">
    <legend className="ov-text px-1 pt-3 text-sm font-semibold">¿Qué prefieres para este viaje?</legend>
    <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label="Preferencia de viaje">
      {([["nearby", "Menos caminata"], ["balanced", "Equilibrada"], ["fastest", "Más rápida"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima ${key === value ? "border-lima bg-lima text-ink-900" : "ov-border ov-text ov-pill"}`}>{label}</button>)}
    </div>
    <p className="ov-text-muted mt-2 text-xs leading-5">{value === "nearby" ? "Priorizamos caminar menos, con hasta 5 min extra frente a la opción más rápida disponible." : value === "balanced" ? "Buscamos un equilibrio entre caminata, tiempo y cambios de camión." : "Priorizamos el menor tiempo estimado de puerta a puerta."}</p>
    {value !== "fastest" && <p className="ov-text-muted mt-1 text-xs leading-5">Preferimos un solo camión cuando el transbordo aporta poco ahorro.</p>}
  </fieldset>;
}

"use client";
import { useId, useState } from "react";
import type { JourneyPreference } from "@/lib/journey-ranking";
import type { JourneySettings } from "@/lib/journey-settings";
export default function JourneyPreferences({ value, onChange, disabled, settings, onSettingsChange }: { value: JourneyPreference; onChange: (value: JourneyPreference) => void; disabled?: boolean; settings: JourneySettings; onSettingsChange: (settings: JourneySettings) => void }) {
  const [expanded, setExpanded] = useState(false);
  const settingsId = useId();
  return <fieldset disabled={disabled} className="ov-border border-b px-4 py-3 disabled:opacity-50">
    <legend className="ov-text px-1 pt-3 text-sm font-semibold">¿Qué prefieres para este viaje?</legend>
    <div className="mt-2 grid grid-cols-3 gap-1" role="group" aria-label="Preferencia de viaje">
      {([["nearby", "Menos caminata"], ["balanced", "Equilibrada"], ["fastest", "Más rápida"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima ${key === value ? "border-lima bg-lima text-ink-900" : "ov-border ov-text ov-pill"}`}>{label}</button>)}
    </div>
    <p className="ov-text-muted mt-2 text-xs leading-5">{value === "nearby" ? `Priorizamos caminar menos, con hasta ${settings.extraMinutes} min extra frente a la opción más rápida que cumple tu límite de caminata.` : value === "balanced" ? "Buscamos un equilibrio entre caminata, tiempo y cambios de camión." : "Priorizamos el menor tiempo estimado entre las opciones que cumplen tu límite de caminata."}</p>
    {value !== "fastest" && <p className="ov-text-muted mt-1 text-xs leading-5">Preferimos un solo camión cuando el transbordo aporta poco ahorro.</p>}
    <button type="button" aria-expanded={expanded} aria-controls={settingsId} onClick={() => setExpanded(!expanded)} className="ov-text mt-2 min-h-11 w-full rounded-lg text-left text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-lima">Ajustar caminata y tiempo · {settings.maxWalkM === null ? "Sin límite" : `Hasta ${settings.maxWalkM} m`} {expanded ? "↑" : "↓"}</button>
    <div id={settingsId} hidden={!expanded} className="space-y-3 pb-2">
      <label className="ov-text block text-xs font-medium">Caminata máxima en todo el viaje
        <select value={settings.maxWalkM ?? "none"} onChange={(event) => onSettingsChange({ ...settings, maxWalkM: event.target.value === "none" ? null : Number(event.target.value) as JourneySettings["maxWalkM"] })} className="ov-pill ov-border ov-text mt-2 min-h-11 w-full rounded-xl border px-3">
          <option value="none">Sin límite</option><option value="300">Hasta 300 m</option><option value="500">Hasta 500 m</option><option value="800">Hasta 800 m</option>
        </select>
      </label>
      {value === "nearby" && <label className="ov-text block text-xs font-medium">Tiempo extra por caminar menos
        <select value={settings.extraMinutes} onChange={(event) => onSettingsChange({ ...settings, extraMinutes: Number(event.target.value) as JourneySettings["extraMinutes"] })} className="ov-pill ov-border ov-text mt-2 min-h-11 w-full rounded-xl border px-3">
          <option value="5">Hasta 5 min más</option><option value="10">Hasta 10 min más</option><option value="15">Hasta 15 min más</option>
        </select>
      </label>}
      <p className="ov-text-muted text-xs leading-5">Incluye caminar para subir, cambiar de camión y llegar al destino. Guardamos estos ajustes en este dispositivo.</p>
    </div>
  </fieldset>;
}

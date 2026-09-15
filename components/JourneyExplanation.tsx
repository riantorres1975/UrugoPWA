import { journeyExplanation } from "@/lib/journey-explanation";
import type { JourneyCost } from "@/lib/journey-ranking";
import type { JourneySettings } from "@/lib/journey-settings";

export default function JourneyExplanation({ active, costs, settings, approximate }: { active?: JourneyCost; costs: JourneyCost[]; settings: JourneySettings; approximate: boolean }) {
  if (!active) return null;
  const { warning, explanation } = journeyExplanation(active, costs, settings);
  return <div className="px-4 py-3 text-xs leading-5" aria-label="Comparación de esta opción">
    {warning && <p role="status" className="mb-2 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-amber-200">{warning}</p>}
    <p className="ov-text">{explanation}</p>
    {approximate && <p className="ov-text-muted mt-1">La comparación incluye caminatas aproximadas.</p>}
  </div>;
}

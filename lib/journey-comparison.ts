import { journeyMinutes, totalWalk, type JourneyCost } from "@/lib/journey-ranking";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
type Option = { names: string[]; cost?: JourneyCost; minutes?: number };
export function compareJourneys(active: Option, alternative: Option): string[] {
  const messages: string[] = [];
  if (active.cost && alternative.cost) {
    const difference = Math.round((totalWalk(alternative.cost) - totalWalk(active.cost)) / 10) * 10;
    if (Math.abs(difference) >= 50) messages.push(`Caminas ~${Math.abs(difference)} m ${difference < 0 ? "menos" : "más"}`);
  }
  const a = active.cost ? journeyMinutes(active.cost) : active.minutes;
  const b = alternative.cost ? journeyMinutes(alternative.cost) : alternative.minutes;
  if (a !== undefined && b !== undefined && Number.isFinite(a) && Number.isFinite(b)) {
    const difference = Math.round(b - a);
    messages.push(Math.abs(difference) < 1 ? "Tiempo similar" : `~${Math.abs(difference)} min ${difference < 0 ? "menos" : "más"} en total`);
  }
  const fare = getJourneyFareSummary(alternative.names).totalMxn - getJourneyFareSummary(active.names).totalMxn;
  messages.push(fare === 0 ? "Mismo costo" : `$${Math.abs(fare)} ${fare < 0 ? "menos" : "más"}`);
  if (alternative.names.length < active.names.length) messages.push("Evitas un transbordo");
  if (alternative.names.length > active.names.length) messages.push("Añades un transbordo");
  return messages;
}

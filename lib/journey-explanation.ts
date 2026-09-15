import { journeyMinutes, totalWalk, type JourneyCost } from "@/lib/journey-ranking";
import type { JourneySettings } from "@/lib/journey-settings";

export function journeyExplanation(active: JourneyCost, options: JourneyCost[], settings: JourneySettings) {
  const all = [active, ...options];
  const fits = all.filter((cost) => settings.maxWalkM === null || totalWalk(cost) <= settings.maxWalkM);
  const exceedsLimit = settings.maxWalkM !== null && totalWalk(active) > settings.maxWalkM;
  const warning = exceedsLimit ? fits.length
    ? `Esta opción supera tu límite de ${settings.maxWalkM} m. Hay otra opción que lo cumple.`
    : `Ninguna de las opciones encontradas cumple el límite de ${settings.maxWalkM} m. La menor caminata disponible es de ~${Math.round(Math.min(...all.map(totalWalk)))} m.` : null;
  const fastest = (fits.length ? fits : all).reduce((best, cost) => journeyMinutes(cost) < journeyMinutes(best) ? cost : best);
  const extraMinutes = Math.round(journeyMinutes(active) - journeyMinutes(fastest));
  const savedWalk = Math.round(totalWalk(fastest) - totalWalk(active));
  let explanation: string;
  if (exceedsLimit && fits.length) explanation = extraMinutes < 0
    ? `Tardas ~${-extraMinutes} min menos que la opción más rápida dentro de tu límite, pero caminas más de lo que elegiste.`
    : "Puedes comparar las alternativas para elegir una que cumpla tu límite de caminata.";
  else if (savedWalk >= 50 && extraMinutes > 0) explanation = `Caminas ~${savedWalk} m menos y tardas ~${extraMinutes} min más que la opción más rápida${settings.maxWalkM !== null && fits.length ? " dentro de tu límite" : ""}.`;
  else if (extraMinutes <= 0) explanation = `Es de las opciones más rápidas${settings.maxWalkM !== null && fits.length ? " dentro de tu límite de caminata" : " encontradas"}.`;
  else if (active.transfers === 0 && fastest.transfers > 0) explanation = `Evitas un transbordo y otro pasaje por ~${extraMinutes} min más de viaje.`;
  else explanation = `Esta opción tarda ~${extraMinutes} min más que la más rápida encontrada.`;
  return { warning, explanation };
}

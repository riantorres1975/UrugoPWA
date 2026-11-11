export const OFFLINE_JOURNEYS_KEY = "urugo-offline-journeys-v1";
export const OFFLINE_JOURNEYS_EVENT = "urugo-offline-journeys-changed";
const MAX_JOURNEYS = 10;

export type OfflineJourney = { id: string; title: string; savedAt: number; html: string };

function isOfflineJourney(value: unknown): value is OfflineJourney {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<OfflineJourney>;
  return typeof entry.id === "string" && entry.id.length > 0 && entry.id.length <= 2_000
    && typeof entry.title === "string" && entry.title.length > 0 && entry.title.length <= 400
    && typeof entry.savedAt === "number" && entry.savedAt > 0 && entry.savedAt <= 8_640_000_000_000_000
    && typeof entry.html === "string" && entry.html.startsWith("<!doctype html>")
    && entry.html.length <= 500_000;
}

export function readOfflineJourneys(): OfflineJourney[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(OFFLINE_JOURNEYS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isOfflineJourney).slice(0, MAX_JOURNEYS);
  } catch {
    return [];
  }
}

export function saveOfflineJourney(journey: Omit<OfflineJourney, "savedAt">): void {
  if (journey.html.length > 500_000) throw new Error("Este recorrido es muy grande. Puedes descargar su ficha.");
  const entry = { ...journey, savedAt: Date.now() };
  if (!isOfflineJourney(entry)) throw new Error("No pudimos preparar esta ficha. Vuelve a calcular el viaje.");
  const remaining = readOfflineJourneys().filter((entry) => entry.id !== journey.id);
  if (remaining.length >= MAX_JOURNEYS) throw new Error("Ya tienes 10 viajes guardados. Quita uno para guardar este.");
  try {
    localStorage.setItem(OFFLINE_JOURNEYS_KEY, JSON.stringify([entry, ...remaining]));
  } catch {
    throw new Error("No hay espacio para guardar el viaje en este dispositivo. Puedes descargar su ficha.");
  }
  window.dispatchEvent(new Event(OFFLINE_JOURNEYS_EVENT));
}

export function removeOfflineJourney(id: string): void {
  localStorage.setItem(OFFLINE_JOURNEYS_KEY, JSON.stringify(readOfflineJourneys().filter((entry) => entry.id !== id)));
  window.dispatchEvent(new Event(OFFLINE_JOURNEYS_EVENT));
}

import type { Coordinates, ProductionRoute } from "@/lib/types";
import type { TripJourney } from "@/lib/trip-mode";
import { getJourneyFareSummary, isTelefericoRouteName } from "@/lib/journey-guidance";

export type JourneySnapshot = {
  routes: { id: number; signature: string; mode: "bus" | "teleferico" }[];
  fareMxn: number;
  origin: Coordinates;
  destination: Coordinates;
};
export type JourneyCatalog = {
  routes: { id: number; signature: string }[];
  fares: { bus: number; teleferico: number };
  source: "static" | "supabase" | "static-fallback";
};

export function isJourneyCatalog(value: unknown): value is JourneyCatalog {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<JourneyCatalog>;
  return ["static", "supabase", "static-fallback"].includes(v.source ?? "")
    && Array.isArray(v.routes) && v.routes.length > 0 && v.routes.every((r) => r && Number.isSafeInteger(r.id) && /^[a-f0-9]{64}$/.test(r.signature))
    && !!v.fares && [v.fares.bus, v.fares.teleferico].every((fare) => typeof fare === "number" && Number.isFinite(fare) && fare >= 0);
}

export async function routeSignature(route: Pick<ProductionRoute, "name" | "path" | "landmarks">) {
  const bytes = new TextEncoder().encode(JSON.stringify([route.name, route.path, route.landmarks]));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isJourneySnapshot(value: unknown): value is JourneySnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<JourneySnapshot>;
  const point = (p: unknown): p is Coordinates => Array.isArray(p) && p.length === 2
    && p.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
  return Array.isArray(v.routes) && v.routes.length >= 1 && v.routes.length <= 2
    && v.routes.every((r) => r && Number.isSafeInteger(r.id) && /^[a-f0-9]{64}$/.test(r.signature)
      && (r.mode === "bus" || r.mode === "teleferico"))
    && typeof v.fareMxn === "number" && Number.isFinite(v.fareMxn) && v.fareMxn >= 0
    && point(v.origin) && point(v.destination);
}

export async function createJourneySnapshot(journey: TripJourney, routes: ProductionRoute[]): Promise<JourneySnapshot> {
  const ids = journey.kind === "direct" ? [journey.routeId] : [journey.routeAId, journey.routeBId];
  const selected = ids.map((id) => routes.find((route) => route.id === id));
  if (selected.some((route) => !route)) throw new Error("Vuelve a calcular el viaje para guardar su versión actual.");
  return {
    routes: await Promise.all(selected.map(async (route) => ({ id: route!.id,
      signature: await routeSignature(route!), mode: isTelefericoRouteName(route!.name) ? "teleferico" as const : "bus" as const }))),
    fareMxn: getJourneyFareSummary(selected.map((route) => route!.name)).totalMxn,
    origin: journey.origin ?? (journey.kind === "direct" ? journey.segment[0] : journey.segmentA[0]),
    destination: journey.destination,
  };
}

export function journeyFreshness(snapshot: JourneySnapshot | undefined, savedAt: number, catalog: JourneyCatalog | null, now = Date.now()) {
  if (!snapshot) return { changed: false, message: "Esta ficha antigua no permite comprobar cambios. Vuelve a planear el viaje antes de salir." };
  if (!catalog) return { changed: false, message: "No se pudieron comprobar cambios. Puedes consultar las indicaciones guardadas." };
  const fare = snapshot.routes.reduce((total, route) => total + catalog.fares[route.mode], 0);
  const fareChanged = fare !== snapshot.fareMxn;
  const routeChanged = catalog.source !== "static-fallback" && snapshot.routes.some((route) =>
    catalog.routes.find((current) => current.id === route.id)?.signature !== route.signature);
  if (fareChanged || routeChanged) return { changed: true,
    message: `${fareChanged ? `La tarifa cambió de $${snapshot.fareMxn} a $${fare}. ` : ""}${routeChanged ? "El recorrido o sus referencias cambiaron. " : ""}Vuelve a planear este viaje; la ficha conserva los datos anteriores.` };
  if (catalog.source === "static-fallback") return { changed: false, message: "No se pudo consultar el catálogo publicado. Comprueba el recorrido antes de salir." };
  return { changed: false, message: `${now - savedAt >= 7 * 86_400_000 ? "Guardado hace más de 7 días. " : ""}Recorrido y tarifa sin cambios en el catálogo. Confirma el servicio antes de salir.` };
}

export function savedJourneyHref(snapshot: JourneySnapshot) {
  return `/mapa?${new URLSearchParams({ a: snapshot.origin.join(","), b: snapshot.destination.join(",") })}`;
}

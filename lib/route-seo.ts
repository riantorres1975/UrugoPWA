import rutasProduccion from "@/data/rutas_produccion_final.json";
import { getRouteDestination, getRouteKey } from "@/lib/route-names";

type ProductionRouteRaw = {
  id: number;
  name: string;
  original_name: string;
  color: string;
  path: number[][];
  landmarks: { name: string; coordinates: number[] }[];
};

export type RouteSeoItem = {
  name: string;
  destination: string | null;
  slug: string;
  color: string;
  hasIda: boolean;
  hasVuelta: boolean;
  distanceKm: number;
  landmarks: string[];
};

function haversineKm(p1: number[], p2: number[]): number {
  const R = 6371;
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLon = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1[1] * Math.PI) / 180) * Math.cos((p2[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pathKm(path: number[][]): number {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversineKm(path[i - 1], path[i]);
  return km;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRouteSeoItems(): RouteSeoItem[] {
  const routes = rutasProduccion as unknown as ProductionRouteRaw[];

  const seen = new Map<string, RouteSeoItem & { totalKm: number }>();
  for (const r of routes) {
    const isVuelta = r.original_name.includes("Vuelta");
    const isTeleferico = r.name === "Teleférico Uruapan";
    const existing = seen.get(r.name);
    const km = pathKm(r.path);
    const lms = r.landmarks.map((l) => l.name);
    if (existing) {
      if (isTeleferico || isVuelta) existing.hasVuelta = true;
      if (isTeleferico || !isVuelta) existing.hasIda = true;
      existing.totalKm += km;
      for (const lm of lms) {
        if (!existing.landmarks.includes(lm)) existing.landmarks.push(lm);
      }
    } else {
      const destination = getRouteDestination(r.name);
      seen.set(r.name, {
        name: r.name,
        destination,
        slug: getRouteKey(r.name),
        color: r.color,
        hasIda: isTeleferico || !isVuelta,
        hasVuelta: isTeleferico || isVuelta,
        distanceKm: 0,
        totalKm: km,
        landmarks: [...lms],
      });
    }
  }

  return Array.from(seen.values()).map(({ totalKm, ...item }) => ({
    ...item,
    distanceKm: Math.round(totalKm * 10) / 10,
  }));
}

export function findRouteSeoItem(slug: string) {
  return getRouteSeoItems().find((route) => route.slug === slug) ?? null;
}

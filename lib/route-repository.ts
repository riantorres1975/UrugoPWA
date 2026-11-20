import staticRouteData from "@/data/rutas_produccion_final.json";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Coordinates, ProductionRoute, ProductionRouteLandmark } from "@/lib/types";
import { cachePublicData, PUBLISHED_ROUTES_CACHE_TAG } from "@/lib/public-data-cache";

export type RouteDataBundle = {
  routes: ProductionRoute[];
  source: "static" | "supabase" | "static-fallback";
  version: string;
};

function isCoordinate(value: unknown): value is Coordinates {
  return Array.isArray(value)
    && value.length === 2
    && value.every((number) => typeof number === "number" && Number.isFinite(number));
}

function isLandmark(value: unknown): value is ProductionRouteLandmark {
  return typeof value === "object"
    && value !== null
    && "name" in value
    && typeof value.name === "string"
    && "point" in value
    && isCoordinate(value.point);
}

function parseDatabaseRoute(value: unknown): ProductionRoute | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "number"
    || typeof row.name !== "string"
    || typeof row.original_name !== "string"
    || typeof row.color !== "string"
    || typeof row.corridor_width_m !== "number"
    || typeof row.verified !== "boolean"
    || !Array.isArray(row.path)
    || !row.path.every(isCoordinate)
    || !Array.isArray(row.landmarks)
    || !row.landmarks.every(isLandmark)
  ) return null;

  return {
    id: row.id,
    name: row.name,
    original_name: row.original_name,
    color: row.color,
    corridor_width_m: row.corridor_width_m,
    verified: row.verified,
    last_verified_at: typeof row.last_verified_at === "string" && Number.isFinite(Date.parse(row.last_verified_at))
      ? new Date(row.last_verified_at).toISOString() : null,
    path: row.path,
    landmarks: row.landmarks,
  };
}

function staticBundle(source: RouteDataBundle["source"] = "static"): RouteDataBundle {
  return {
    routes: staticRouteData as ProductionRoute[],
    source,
    version: "static-2026-08",
  };
}

async function queryPublishedRouteData(): Promise<RouteDataBundle> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado");

  const { data, error } = await supabase
    .from("routes")
    .select("id,name,original_name,color,corridor_width_m,verified,last_verified_at,path,landmarks,data_version,updated_at")
    .eq("publication_status", "published")
    .eq("operational_status", "active")
    .order("id", { ascending: true })
    .abortSignal(AbortSignal.timeout(8_000));

  if (error || !data?.length) {
    throw new Error(error?.message ?? "sin rutas publicadas");
  }

  const routes = data.map(parseDatabaseRoute).filter((route): route is ProductionRoute => route !== null);
  if (routes.length !== data.length) {
    throw new Error("Una o más rutas publicadas no cumplen el contrato esperado.");
  }

  const latestUpdate = data.reduce((latest, row) => {
    const timestamp = Date.parse(String(row.updated_at));
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
  return { routes, source: "supabase", version: `supabase-${latestUpdate}-${routes.length}` };
}

const readPublishedRoutes = cachePublicData(PUBLISHED_ROUTES_CACHE_TAG, queryPublishedRouteData);

export async function getPublishedRouteData(): Promise<RouteDataBundle> {
  if (process.env.ROUTE_DATA_SOURCE?.trim().toLowerCase() !== "supabase") return staticBundle();
  try {
    return await readPublishedRoutes();
  } catch (error) {
    // A database outage must not persist the static backup as the published catalog.
    console.error("[route-repository] Usando respaldo estático:", error instanceof Error ? error.message : "consulta fallida");
    return staticBundle("static-fallback");
  }
}

import staticRouteData from "@/data/rutas_produccion_final.json";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { Coordinates, ProductionRoute, ProductionRouteLandmark } from "@/lib/types";

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

export async function getPublishedRouteData(): Promise<RouteDataBundle> {
  if (process.env.ROUTE_DATA_SOURCE?.trim().toLowerCase() !== "supabase") {
    return staticBundle();
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return staticBundle("static-fallback");

  const { data, error } = await supabase
    .from("routes")
    .select("id,name,original_name,color,corridor_width_m,verified,last_verified_at,path,landmarks,data_version,updated_at")
    .eq("publication_status", "published")
    .eq("operational_status", "active")
    .order("id", { ascending: true });

  if (error || !data?.length) {
    console.error("[route-repository] Usando respaldo estático:", error?.message ?? "sin rutas publicadas");
    return staticBundle("static-fallback");
  }

  const routes = data.map(parseDatabaseRoute).filter((route): route is ProductionRoute => route !== null);
  if (routes.length !== data.length) {
    console.error("[route-repository] Una o más rutas publicadas no cumplen el contrato esperado.");
    return staticBundle("static-fallback");
  }

  const latestUpdate = data.reduce((latest, row) => {
    const timestamp = Date.parse(String(row.updated_at));
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
  }, 0);
  return { routes, source: "supabase", version: `supabase-${latestUpdate}-${routes.length}` };
}

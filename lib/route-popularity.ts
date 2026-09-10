import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRouteSeoItems, type RouteSeoItem } from "@/lib/route-seo";

const FALLBACK_ROUTE_NAMES = ["Ruta 176", "Ruta 17", "Ruta 45", "Ruta 10"] as const;
const RANKING_DAYS = 30;

type PopularRouteRow = {
  route_key: string;
  consultation_count: number | string;
};

export type PopularRoutesResult = {
  basedOnUsage: boolean;
  routes: RouteSeoItem[];
};

function fallbackRoutes(allRoutes: RouteSeoItem[], limit: number): RouteSeoItem[] {
  return FALLBACK_ROUTE_NAMES
    .map((name) => allRoutes.find((route) => route.name === name))
    .filter((route): route is RouteSeoItem => route !== undefined)
    .slice(0, limit);
}

export async function getPopularRoutes(limit = 4): Promise<PopularRoutesResult> {
  const safeLimit = Math.min(40, Math.max(1, Math.trunc(limit)));
  const allRoutes = getRouteSeoItems().filter((route) => route.slug !== "teleferico-uruapan");
  const fallback = fallbackRoutes(allRoutes, safeLimit);
  const supabase = createSupabaseAdminClient();

  if (!supabase) return { basedOnUsage: false, routes: fallback };

  try {
    const { data, error } = await supabase.rpc("get_popular_routes", {
      p_days: RANKING_DAYS,
      p_limit: Math.min(40, safeLimit * 3),
    });

    if (error) throw new Error(error.message);

    const routesBySlug = new Map(allRoutes.map((route) => [route.slug, route]));
    const rankedRoutes = ((data ?? []) as PopularRouteRow[])
      .map((row) => routesBySlug.get(row.route_key))
      .filter((route): route is RouteSeoItem => route !== undefined)
      .slice(0, safeLimit);

    if (rankedRoutes.length < safeLimit) {
      return { basedOnUsage: false, routes: fallback };
    }

    return { basedOnUsage: true, routes: rankedRoutes };
  } catch (error) {
    console.warn(
      "[route-popularity] No se pudo cargar el ranking:",
      error instanceof Error ? error.message : error,
    );
    return { basedOnUsage: false, routes: fallback };
  }
}

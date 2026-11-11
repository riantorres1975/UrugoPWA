import { getPublishedRouteData } from "@/lib/route-repository";
import { getJourneyFareSummary } from "@/lib/journey-guidance";
import { routeSignature } from "@/lib/offline-journey-freshness";

export const dynamic = "force-dynamic";

export async function GET() {
  const bundle = await getPublishedRouteData();
  return Response.json({
    source: bundle.source,
    routes: await Promise.all(bundle.routes.map(async (route) => ({ id: route.id, signature: await routeSignature(route) }))),
    fares: { bus: getJourneyFareSummary(["Camión urbano"]).totalMxn,
      teleferico: getJourneyFareSummary(["Teleférico Uruapan"]).totalMxn },
  }, { headers: { "Cache-Control": "no-store" } });
}

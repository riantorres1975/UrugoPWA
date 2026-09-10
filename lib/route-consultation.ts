import { findRouteSeoItem, getRouteSeoItems, type RouteSeoItem } from "@/lib/route-seo";

export const ROUTE_CONSULTATION_SOURCES = ["route_page", "map"] as const;

export type RouteConsultationSource = (typeof ROUTE_CONSULTATION_SOURCES)[number];

type RouteConsultationPayload = {
  routeKey?: unknown;
  routeName?: unknown;
  source?: unknown;
};

export type ParsedRouteConsultation = {
  route: RouteSeoItem;
  source: RouteConsultationSource;
};

function isSource(value: unknown): value is RouteConsultationSource {
  return typeof value === "string"
    && ROUTE_CONSULTATION_SOURCES.includes(value as RouteConsultationSource);
}

export function parseRouteConsultation(value: unknown): ParsedRouteConsultation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as RouteConsultationPayload;
  if (!isSource(payload.source)) return null;

  let route: RouteSeoItem | null = null;
  if (typeof payload.routeKey === "string" && payload.routeKey.length <= 140) {
    route = findRouteSeoItem(payload.routeKey.trim());
  }

  if (!route && typeof payload.routeName === "string" && payload.routeName.length <= 140) {
    const normalizedName = payload.routeName.trim().toLocaleLowerCase("es-MX");
    route = getRouteSeoItems().find(
      (candidate) => candidate.name.toLocaleLowerCase("es-MX") === normalizedName,
    ) ?? null;
  }

  if (!route || route.slug === "teleferico-uruapan") return null;
  return { route, source: payload.source };
}

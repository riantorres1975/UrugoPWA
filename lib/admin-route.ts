import type { Coordinates } from "@/lib/types";

export const ROUTE_OPERATIONAL_STATUSES = ["active", "under_review", "inactive", "historical"] as const;
export const MAX_ROUTE_POINTS = 20_000;

export type RouteOperationalStatus = (typeof ROUTE_OPERATIONAL_STATUSES)[number];

export type RoutePublicationInput = {
  routeId: number;
  expectedVersion: number;
  name: string;
  originalName: string;
  color: string;
  corridorWidthM: number;
  operationalStatus: RouteOperationalStatus;
  path: Coordinates[];
  changeSummary: string;
  reportId: string | null;
};

export type RouteActionState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_ROUTE_ACTION_STATE: RouteActionState = { status: "idle", message: "" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function normalizedText(value: FormDataEntryValue | null, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function parseRouteCoordinate(value: unknown): Coordinates | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  if (
    !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
    || longitude < -103
    || longitude > -101
    || latitude < 18.5
    || latitude > 20.5
  ) return null;
  return [longitude, latitude];
}

export function parseRoutePath(value: string): Coordinates[] | null {
  if (!value || value.length > 750_000) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    let candidate: unknown = parsed;

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const object = parsed as Record<string, unknown>;
      if (object.type === "Feature" && typeof object.geometry === "object" && object.geometry !== null) {
        candidate = (object.geometry as Record<string, unknown>).coordinates;
      } else if (object.type === "LineString") {
        candidate = object.coordinates;
      }
    }

    if (!Array.isArray(candidate) || candidate.length < 2 || candidate.length > MAX_ROUTE_POINTS) return null;
    const path = candidate.map(parseRouteCoordinate);
    return path.every((point): point is Coordinates => point !== null) ? path : null;
  } catch {
    return null;
  }
}

export function insertRoutePoint(
  path: Coordinates[],
  anchor: number,
  side: "before" | "after",
  point: Coordinates,
): { path: Coordinates[]; index: number } {
  const index = side === "before" ? anchor : anchor + 1;
  return { path: [...path.slice(0, index), point, ...path.slice(index)], index };
}

export function getReportRouteEditorHref(report: {
  id: string;
  route_id: number | null;
  route_name: string | null;
  route_key: string | null;
}): string {
  const search = new URLSearchParams({ reporte: report.id });
  if (report.route_id !== null) return `/admin/routes/${report.route_id}?${search}`;
  const route = report.route_name || report.route_key;
  if (route) search.set("buscar", route);
  return `/admin/routes?${search}`;
}

export function parseRoutePublicationForm(formData: FormData): RoutePublicationInput | null {
  const routeId = Number(formData.get("routeId"));
  const expectedVersion = Number(formData.get("expectedVersion"));
  const corridorWidthM = Number(formData.get("corridorWidthM"));
  const name = normalizedText(formData.get("name"), 120);
  const originalName = normalizedText(formData.get("originalName"), 160);
  const color = normalizedText(formData.get("color"), 7)?.toLowerCase() ?? null;
  const changeSummary = normalizedText(formData.get("changeSummary"), 1_000);
  const operationalStatus = normalizedText(formData.get("operationalStatus"), 30);
  const reportIdValue = normalizedText(formData.get("reportId"), 36);
  const pathValue = formData.get("path");

  if (
    !Number.isSafeInteger(routeId)
    || routeId <= 0
    || !Number.isSafeInteger(expectedVersion)
    || expectedVersion <= 0
    || !Number.isInteger(corridorWidthM)
    || corridorWidthM < 10
    || corridorWidthM > 1_000
    || !name
    || name.length < 2
    || !originalName
    || originalName.length < 2
    || !color
    || !COLOR_PATTERN.test(color)
    || !changeSummary
    || changeSummary.length < 10
    || !operationalStatus
    || !ROUTE_OPERATIONAL_STATUSES.includes(operationalStatus as RouteOperationalStatus)
    || typeof pathValue !== "string"
  ) return null;

  const path = parseRoutePath(pathValue);
  if (!path || (reportIdValue && !UUID_PATTERN.test(reportIdValue))) return null;

  return {
    routeId,
    expectedVersion,
    name,
    originalName,
    color,
    corridorWidthM,
    operationalStatus: operationalStatus as RouteOperationalStatus,
    path,
    changeSummary,
    reportId: reportIdValue,
  };
}


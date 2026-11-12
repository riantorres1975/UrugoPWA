import { MAX_ROUTE_POINTS, ROUTE_OPERATIONAL_STATUSES, parseRouteCoordinate, parseRoutePath, type RouteSegmentDraft } from "@/lib/admin-route";

export type EditorDraft = {
  routeId: number; baseVersion: number; reportId: string | null; savedAt: number;
  path: string; name: string; direction: string; color: string; width: string; operationalStatus: string; summary: string;
  segment: RouteSegmentDraft | null;
  submitted?: boolean;
};
const DRAFT_PREFIX = "urugo-admin-route-draft-v1";
const DRAFT_LIFETIME = 7 * 86_400_000;
const key = (id: number, reportId: string | null) => `${DRAFT_PREFIX}:${id}:${reportId ?? "manual"}`;

export function parseEditorDraft(raw: string | null, routeId: number, reportId: string | null, now = Date.now()): EditorDraft | null {
  if (!raw || raw.length > 1_600_000) return null;
  try {
    const v = JSON.parse(raw) as EditorDraft;
    if (!v || v.routeId !== routeId || v.reportId !== reportId || !Number.isSafeInteger(v.baseVersion) || v.baseVersion < 1
      || !Number.isFinite(v.savedAt) || v.savedAt > now + 60_000 || now - v.savedAt > DRAFT_LIFETIME
      || typeof v.path !== "string" || v.path.length > 750_000
      || typeof v.name !== "string" || v.name.length > 120 || typeof v.direction !== "string" || v.direction.length > 160
      || typeof v.color !== "string" || !/^#[a-f0-9]{6}$/i.test(v.color)
      || typeof v.width !== "string" || v.width.length > 8
      || !ROUTE_OPERATIONAL_STATUSES.includes(v.operationalStatus as typeof ROUTE_OPERATIONAL_STATUSES[number])
      || typeof v.summary !== "string" || v.summary.length > 1000
      || (v.submitted !== undefined && typeof v.submitted !== "boolean")) return null;
    if (v.segment !== null) {
      const path = parseRoutePath(v.path);
      const segment = v.segment;
      if (!path || !segment || (segment.start !== null && (!Number.isInteger(segment.start) || !path[segment.start]))
        || (segment.end !== null && (!Number.isInteger(segment.end) || !path[segment.end] || segment.start === null || segment.end === segment.start))
        || !Array.isArray(segment.points) || segment.points.length > MAX_ROUTE_POINTS || !segment.points.every(parseRouteCoordinate)) return null;
    }
    return v;
  } catch { return null; }
}

export function readEditorDraft(routeId: number, reportId: string | null): EditorDraft | null {
  try { return parseEditorDraft(localStorage.getItem(key(routeId, reportId)), routeId, reportId); }
  catch { return null; }
}

export function saveEditorDraft(draft: Omit<EditorDraft, "savedAt">): EditorDraft {
  const entry = { ...draft, savedAt: Date.now() };
  localStorage.setItem(key(entry.routeId, entry.reportId), JSON.stringify(entry));
  return entry;
}

export function removeEditorDraft(routeId: number, reportId: string | null) {
  localStorage.removeItem(key(routeId, reportId));
}

export function sameEditorRoute(a: Pick<EditorDraft, "path" | "name" | "direction" | "color" | "width" | "operationalStatus">, b: Pick<EditorDraft, "path" | "name" | "direction" | "color" | "width" | "operationalStatus">) {
  const normalized = (v: typeof a) => [JSON.stringify(parseRoutePath(v.path)) ?? v.path,
    v.name.trim().replace(/\s+/g, " "), v.direction.trim().replace(/\s+/g, " "), v.color.toLowerCase(), Number(v.width), v.operationalStatus];
  return JSON.stringify(normalized(a)) === JSON.stringify(normalized(b));
}

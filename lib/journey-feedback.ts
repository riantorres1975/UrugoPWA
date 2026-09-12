export const FEEDBACK_REASONS = {
  bus_missing: "No pasó el camión",
  route_incorrect: "El recorrido es incorrecto",
  transfer_far: "El transbordo está lejos",
  other: "Otro problema",
} as const;

export type FeedbackReason = keyof typeof FEEDBACK_REASONS;

export type JourneyFeedbackPayload = {
  deviceId: string;
  routes: string[];
  useful: boolean;
  reason: FeedbackReason | null;
};

export function parseJourneyFeedback(value: unknown): JourneyFeedbackPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.deviceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.deviceId)) return null;
  if (typeof raw.useful !== "boolean" || !Array.isArray(raw.routes) || raw.routes.length < 1 || raw.routes.length > 2) return null;
  if (!raw.routes.every((route) => typeof route === "string" && route.trim().length > 0 && route.length <= 140)) return null;
  const routes = (raw.routes as string[]).map((route) => route.trim());
  if (new Set(routes).size !== routes.length) return null;
  const reason = raw.reason ?? null;
  if (reason !== null && (typeof reason !== "string" || !Object.hasOwn(FEEDBACK_REASONS, reason))) return null;
  if (reason !== null && (raw.useful || (reason === "transfer_far" && routes.length !== 2))) return null;
  return { deviceId: raw.deviceId, routes, useful: raw.useful, reason: reason as FeedbackReason | null };
}

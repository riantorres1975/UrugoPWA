import type { JourneyFeedbackPayload } from "@/lib/journey-feedback";

type SavedVote = Pick<JourneyFeedbackPayload, "useful" | "reason">;
let fallbackDevice: string | undefined;

function voteKey(routes: string[]) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
  return `urugo:feedback:${day}:${routes.join("|")}`;
}

export function readFeedback(routes: string[]): SavedVote | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(voteKey(routes)) ?? "null");
    return saved && typeof saved.useful === "boolean" ? saved : null;
  } catch { return null; }
}

export async function saveFeedback(routes: string[], vote: SavedVote) {
  let deviceId = fallbackDevice ??= crypto.randomUUID();
  try {
    const stored = localStorage.getItem("urugo:feedback-device");
    if (stored && /^[0-9a-f-]{36}$/i.test(stored)) deviceId = stored;
    localStorage.setItem("urugo:feedback-device", deviceId);
  } catch { /* Restricted storage: preserve the ID for this page session. */ }
  const response = await fetch("/api/community/journey-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, routes, ...vote }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No pudimos guardar tu opinión. Intenta de nuevo.");
  }
  try { sessionStorage.setItem(voteKey(routes), JSON.stringify(vote)); } catch { /* Saving in Supabase succeeded. */ }
}

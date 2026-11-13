export const SUPPORT_REMINDER_UNTIL = "urugo-support-reminder-until-v1";
export const SUPPORT_VISITS_KEY = "urugo-support-visits-v1";
export const SUPPORT_REMINDER_DELAY = 60_000;
export const SUPPORT_REMINDER_DAYS = 30;
export type SupportVisits = { count: number; lastVisit: number };

export function registerSupportVisit(raw: string | null, now: number): SupportVisits {
  let previous: SupportVisits | null = null;
  try {
    const value = JSON.parse(raw ?? "null");
    if (value && Number.isSafeInteger(value.count) && value.count > 0 && Number.isFinite(value.lastVisit) && value.lastVisit > 0) previous = value;
  } catch { /* Corrupt local state starts a new quiet period. */ }
  if (!previous) return { count: 1, lastVisit: now };
  // Reloads, StrictMode and short visits do not make the reminder appear sooner.
  return now - previous.lastVisit >= 6 * 3600_000 ? { count: Math.min(100, previous.count + 1), lastVisit: now } : previous;
}

export function canShowSupportReminder(visits: SupportVisits, quietUntil: number, now: number, mountedAt: number) {
  return visits.count >= 2 && Number.isFinite(quietUntil) && now >= quietUntil && now - mountedAt >= SUPPORT_REMINDER_DELAY;
}

export const SAFE_CHAT_FALLBACK =
  "No pude verificar esa respuesta. Consulta el mapa de UruGo marcando tu origen y destino.";

export const CHAT_INTENTS = ["help", "visit", "nature", "culture", "food", "directions", "outside_scope"] as const;
export type ChatIntent = typeof CHAT_INTENTS[number];
/** Generated prose is never evidence. The model can only select a known intent. */
export function parseChatIntent(raw: unknown): ChatIntent | null {
  if (typeof raw !== "string" || raw.length > 300) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "intent")) return null;
    return CHAT_INTENTS.includes(record.intent as ChatIntent) ? record.intent as ChatIntent : null;
  } catch { return null; }
}

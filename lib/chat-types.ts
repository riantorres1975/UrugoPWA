export type ChatAction = { label: string; href?: string; prompt?: string };
export type ChatPlaceCard = {
  id: string; title: string; category: string; description: string; detail: string;
  href: string; source: { label: string; href: string };
};
export type ChatAnswer = {
  reply: string;
  actions?: ChatAction[];
  places?: ChatPlaceCard[];
  suggestions?: string[];
  evidence?: string;
};

/** Links are supplied by our catalogue and planner, never by the language model. */
export function safeChatHref(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 1500) return;
  if (/^\/(?:mapa|horarios|rutas|ruta\/|reportar-error)(?:[/?#]|$)/.test(value) && !value.includes("\\")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && [
      "uruapan.gob.mx", "www.gob.mx", "fabricadesanpedro.com", "descubreanp.conanp.gob.mx",
    ].includes(url.hostname)) return url.href;
  } catch { /* An invalid URL is not rendered as a link. */ }
}

const SENSITIVE_QUERY_PARAMS = new Set(["a", "b", "destino", "ia", "ib", "tas", "tax", "tbx", "tbe", "codigo", "code"]);
export function safeAnalyticsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.pathname.startsWith("/apoyar/mi-aporte")) return null;
    url.hash = "";
    for (const key of SENSITIVE_QUERY_PARAMS) url.searchParams.delete(key);
    return url.toString();
  } catch { return null; }
}

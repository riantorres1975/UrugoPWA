export function normalizeRouteSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

export function publicRouteNumber(name: string) {
  return name.match(/\bruta\s*(\d+[a-z]?)/i)?.[1].toUpperCase() ?? "TF";
}

export function matchesPublicRoute(query: string, name: string, searchText: string) {
  const normalized = normalizeRouteSearch(query);
  const candidate = normalized.match(/^(?:ruta\s*)?(\d+[a-z]?)(?=\s|$)/i);
  // "12 de Diciembre" is a place name; only explicit route numbers are exact here.
  const number = candidate && (!/^de(?:l)?\s/.test(normalized.slice(candidate[0].length).trim()) || normalized.startsWith("ruta")) ? candidate : null;
  if (number && publicRouteNumber(name).toLowerCase() !== number[1]) return false;
  const words = (number ? normalized.slice(number[0].length) : normalized).split(" ").filter(Boolean);
  const haystack = normalizeRouteSearch(searchText);
  return words.every((word) => haystack.includes(word));
}

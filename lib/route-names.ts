const ALIASES: Record<string, string[]> = {
  // Hospitales y clínicas
  "Ruta 1":   ["hospital", "hospital regional", "IMSS bienestar", "mercado municipal", "centro histórico", "centro"],
  "Ruta 1A":  ["hospital", "hospital regional", "IMSS bienestar", "palito verde", "san jose"],
  "Ruta 45":  ["interclínicas", "interClinicas", "clínicas", "clinicas", "hospitales", "zona médica", "IMSS"],
  "Ruta 176": ["clínica 76", "clinica 76", "IMSS", "brisas", "Las Brisas", "quinta"],

  // Escuelas y centros de capacitación
  "Ruta 11":  ["central", "camionera", "central camionera", "presidencia", "presidencia municipal", "héroes", "heroes", "estudiantes"],
  "Ruta 31":  ["jaramillo", "cecati", "capacitación", "capacitacion"],
  "Ruta 66":  ["plan de ayala", "eti", "ETI 30", "secundaria técnica", "secundaria tecnica", "estudiantes"],
  "Ruta 102": ["EST 102", "escuela secundaria", "secundaria técnica", "secundaria tecnica", "estudiantes"],

  // Comercial, industrial y plazas
  "Ruta 5":   ["caltzontzin", "central camionera", "central", "boulevard industrial", "boulevard", "industrial", "empacadoras", "plaza ágora", "plaza agora", "ágora", "agora"],
  "Ruta 7":   ["pemex", "colonia pemex", "centro histórico", "centro historico", "primer cuadro", "centro"],

  // Colonias y zonas residenciales
  "Ruta 2":   ["constituyentes", "jicalán", "jicalan", "san joaquín", "san joaquin", "zorrillos"],
  "Ruta 2A":  ["constituyentes", "zumpimito"],
  "Ruta 6":   ["pemex", "taximacuaro"],
  "Ruta 9":   ["arroyo", "colorado"],
  "Ruta 15":  ["patria", "infonavit patria", "deportiva", "unidad deportiva"],
  "Ruta 15A": ["patria", "infonavit patria", "cuauhtémoc", "cuauhtemoc"],
  "Ruta 19":  ["quirindavara", "taximacuaro"],
  "Ruta 20":  ["cuba", "mexico", "méxico", "circunvalación", "circunvalacion", "morelos", "topilejo"],
  "Ruta 24":  ["jucutacato", "centro"],
  "Ruta 26":  ["constituyentes", "unidad", "sol naciente","centro","central","hospital regional","don vasco","universidad don vasco"],
  "Ruta 27":  ["balcones", "tec", "tecnológico", "tecnologico", "Tec Uruapan, centro","don vasco","central","central de autobuses"],
  "Ruta 33":  ["toreo"],
  "Ruta 40":  ["jucutacato"],
  "Ruta 76":  ["constituyentes", "sol naciente","centro","central de abastos","quiridavara"],
  "Ruta 85":  ["toreo"],
};

const DESTINATIONS: Record<string, string> = {
  "Ruta 1": "PALITO VERDE ↔ Unidad",
  "Ruta 1A": "San José de la Mina ↔ Palito Verde",
  "Ruta 2": "Constituyentes ↔ Jicalán",
  "Ruta 2A": "Constituyentes ↔ Zumpimito",
  "Ruta 3": "Zapata",
  "Ruta 4": "Zapata",
  "Ruta 5": "Caltzontzin",
  "Ruta 6": "Pemex ↔ Taximacuaro",
  "Ruta 7": "Pemex ↔ Centro",
  "Ruta 8": "Río Volga",
  "Ruta 9": "Arroyo Colorado",
  "Ruta 10": "Charanda",
  "Ruta 11": "Central Camionera",
  "Ruta 12": "12 de Diciembre",
  "Ruta 13": "Fovissste",
  "Ruta 14": "Llanitos",
  "Ruta 15": "Inf. Patria ↔ Unidad Deportiva",
  "Ruta 15A": "Inf. Patria ↔ Cuauhtémoc",
  "Ruta 17": "Purhépechas",
  "Ruta 18": "18 de Marzo",
  "Ruta 19": "Quirindavara ↔ Taximacuaro",
  "Ruta 20": "Cuba ↔ México",
  "Ruta 21": "Lindavista",
  "Ruta 22": "Cuauhtémoc",
  "Ruta 24": "Jucutacato",
  "Ruta 25": "Antorcha",
  "Ruta 26": "Constituyentes ↔ Unidad",
  "Ruta 27": "Balcones",
  "Ruta 28": "Mapeco",
  "Ruta 31": "Jaramillo ↔ Cecati",
  "Ruta 33": "Toreo",
  "Ruta 35": "La Mora",
  "Ruta 40": "Jucutacato",
  "Ruta 45": "Interclínicas",
  "Ruta 50": "Balcones",
  "Ruta 66": "Plan de Ayala ↔ Eti 30",
  "Ruta 76": "Constituyentes",
  "Ruta 85": "Toreo",
  "Ruta 102": "EST 102",
  "Ruta 176": "Quinta ↔ Clínica 76"
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const LOOKUP = new Map<string, string>(
  Object.entries(DESTINATIONS).map(([key, value]) => [normalize(key), value])
);

export function getRouteDestination(routeName: string): string | null {
  return LOOKUP.get(normalize(routeName)) ?? null;
}

/** Public route identity, shared by route pages and reports from the map. */
export function getRouteKey(routeName: string): string {
  const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const destination = getRouteDestination(routeName);
  return `${slug(routeName)}${destination ? `-${slug(destination)}` : ""}`;
}

export function getRouteSearchTerms(routeName: string): string[] {
  const destino = getRouteDestination(routeName);
  const terms: string[] = [];

  if (destino) {
    // Split "A ↔ B" into individual searchable terms
    terms.push(...destino.split(/\s*↔\s*/).map((t) => t.trim()).filter(Boolean));
  }

  const aliases = ALIASES[routeName] ?? [];
  terms.push(...aliases);

  return terms;
}

export function formatRouteLabel(routeName: string, baseName?: string): string {
  const base = (baseName ?? routeName).trim();
  const destino = getRouteDestination(base);
  if (!destino) return routeName;
  const directionMatch = routeName.match(/\((ida|vuelta)\)\s*$/i);
  const directionSuffix = directionMatch ? ` (${directionMatch[1].toLowerCase()})` : "";
  return `${destino} · ${base}${directionSuffix}`;
}

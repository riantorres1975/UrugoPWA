import { SEARCHABLE_PLACES } from "@/lib/geocode";
import { VISITOR_PLACES, type VisitorPlace } from "@/lib/chat-places";
import type { ChatAnswer, ChatPlaceCard } from "@/lib/chat-types";
import type { Coordinates, ProductionRoute } from "@/lib/types";
import { FARES_2026 } from "@/lib/mobility-config";
import { getSchedule, getScheduleStatus } from "@/lib/schedules";
import { getClosestPointOnPath } from "@/lib/routeMatcher";
import { calculateRouteOptions } from "@/lib/route-calculation";
import { journeyMinutes, rankJourneys, totalWalk, type JourneyCost } from "@/lib/journey-ranking";
import { haversineMeters } from "@/lib/geo";

export type ChatPlace = { label: string; center?: Coordinates; visitor?: VisitorPlace };
export type ChatInput = { message: string; history: string[]; location: { lat: number; lng: number } | null };
export type ChatRouteLoader = () => Promise<{ routes: ProductionRoute[]; source: string }>;
export function normalizeChatText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
const has = (text: string, alias: string) => (` ${text} `).includes(` ${normalizeChatText(alias)} `);
const AMBIGUOUS_ALIASES = new Set(["hospital", "regional", "mercado", "poniente", "parque", "escuela", "universidad", "estacion", "terminal", "aeropuerto", "libramiento", "industrial", "coppel"]);
const catalogue = [
  ...VISITOR_PLACES.map((visitor) => ({ label: visitor.label, center: visitor.center, aliases: visitor.aliases, visitor })),
  ...SEARCHABLE_PLACES.filter((place) => !VISITOR_PLACES.some((visitor) => normalizeChatText(visitor.label) === normalizeChatText(place.label)))
    .map((place) => ({ ...place, visitor: undefined })),
];

/** Only whole, known names/aliases match. A partial word is never a destination. */
export function findChatPlaces(value: string): ChatPlace[] {
  const text = normalizeChatText(value);
  const scored = catalogue.map((place) => ({ place, score: Math.max(0, ...[place.label, ...place.aliases]
    .filter((alias) => !AMBIGUOUS_ALIASES.has(normalizeChatText(alias))
      && !(normalizeChatText(alias) === "centro" && /\bcentro (?:comercial|medico|cultural|de)\b/.test(text))
      && has(text, alias)).map((alias) => normalizeChatText(alias).length)) })).filter((hit) => hit.score > 0);
  const best = Math.max(0, ...scored.map((hit) => hit.score));
  return scored.filter((hit) => hit.score === best).map((hit) => hit.place)
    .filter((place, index, all) => all.findIndex((other) => normalizeChatText(other.label) === normalizeChatText(place.label)) === index);
}
const onePlace = (value: string) => { const found = findChatPlaces(value); return found.length === 1 ? found[0] : undefined; };

export function chatMapHref(destination?: ChatPlace, origin?: Coordinates) {
  const params = new URLSearchParams();
  if (destination?.center) params.set("b", destination.center.map((n) => n.toFixed(6)).join(","));
  if (destination) params.set("destino", destination.label);
  if (origin) params.set("a", origin.map((n) => n.toFixed(6)).join(","));
  return `/mapa${params.size ? `?${params}` : ""}`;
}
function card(place: VisitorPlace): ChatPlaceCard {
  return { id: place.id, title: place.label, category: place.category, description: place.description,
    detail: place.detail, href: chatMapHref(place), source: place.source };
}
const mapAction = (destination?: ChatPlace, origin?: Coordinates) => ({ label: origin ? "Revisar trayecto en el mapa" : destination ? "Elegir origen en el mapa" : "Abrir mapa", href: chatMapHref(destination, origin) });
export const CHAT_HELP: ChatAnswer = {
  reply: "Te ayudo con rutas, horarios y lugares para visitar en Uruapan. Para un viaje dime desde dónde sales y a dónde quieres llegar; también puedes compartir tu ubicación.",
  suggestions: ["¿Qué puedo visitar en Uruapan?", "¿Cuánto cuesta el camión?", "¿Cómo llego al Parque Nacional?"],
  actions: [mapAction(), { label: "Ver horarios", href: "/horarios" }],
};

export function resolveChatTrip(input: ChatInput) {
  let destination: ChatPlace | undefined;
  let origin: ChatPlace | undefined;
  let unresolvedOrigin = false;
  let gpsOrigin = false;
  for (const raw of [...input.history.slice(-8), input.message]) {
    const text = normalizeChatText(raw);
    if (/\b(olvida|otro viaje|nuevo viaje)\b/.test(text)) { destination = undefined; origin = undefined; }
    if (/\bno (?:salgo|estoy|parto|me encuentro)\b/.test(text)) { origin = undefined; unresolvedOrigin = true; continue; }
    const from = text.match(/\b(?:desde|(?:quiero ir|voy|ir|como llego|como llegar) del?|salgo del?|estoy en|me encuentro en|parto del?)\s+(.+)$/)
      ?? text.match(/^del?\s+(.+)$/);
    if (from) {
      const split = from[1].split(/\s+(?:hasta|hacia|para ir a|al|a)\s+/);
      gpsOrigin = /^(?:mi ubicacion(?: actual)?|aqui|donde estoy|mi posicion)$/.test(split[0]);
      origin = onePlace(split[0]); unresolvedOrigin = !origin?.center && !(gpsOrigin && input.location);
      const to = split.length > 1 ? onePlace(split.slice(1).join(" ")) : onePlace(text.slice(0, from.index));
      if (to) destination = to;
      else if (split.length > 1 || /\b(?:ir|llego|llegar|voy)\s+(?:al?|hacia|hasta)\s+/.test(text.slice(0, from.index))) destination = undefined;
    } else {
      const place = onePlace(text);
      if (place) destination = place;
      else if (/\b(?:ir|llego|llegar|voy)\s+(?:al?|hacia|hasta)\s+(?!ahi\b|alli\b)/.test(text)) destination = undefined;
    }
  }
  const coords = origin?.center ?? (!unresolvedOrigin && input.location ? [input.location.lng, input.location.lat] as Coordinates : undefined);
  return { destination, origin, originCoords: coords, unresolvedOrigin };
}

function exactRouteNames(text: string, routes: ProductionRoute[]) {
  const codes = [...text.matchAll(/\bruta\s*(\d+[a-z]?)\b/g)].map((match) => match[1]);
  return [...new Set(routes.filter((route) => codes.includes(normalizeChatText(route.name).match(/^ruta\s*(\d+[a-z]?)/)?.[1] ?? "")
    || (has(text, "teleferico") && normalizeChatText(route.name).includes("teleferico"))).map((route) => route.name))];
}
function nearbyRoutes(place: ChatPlace, routes: ProductionRoute[]) {
  if (!place.center) return [];
  const found = new Map<string, number>();
  for (const route of routes) {
    if (route.path.length < 2) continue;
    const distance = route.name === "Teleférico Uruapan"
      ? Math.min(...route.path.map((point) => haversineMeters(place.center!, point)))
      : getClosestPointOnPath(place.center, route.path).distM;
    if (distance > 500 || (found.get(route.name) ?? Infinity) <= distance) continue;
    found.set(route.name, distance);
  }
  return [...found].sort((a,b) => a[1] - b[1]).slice(0, 4);
}
function routeNamesText(names: string[]) { return names.join(" · "); }
const approxM = (meters: number) => Math.max(10, Math.round(meters / 10) * 10);

export async function buildChatAnswer(input: ChatInput, loadRoutes: ChatRouteLoader): Promise<ChatAnswer | null> {
  let routeData: ReturnType<ChatRouteLoader> | undefined;
  const getRoutes = () => routeData ??= loadRoutes();
  const text = normalizeChatText(input.message);
  const trip = resolveChatTrip(input);
  const currentPlaces = findChatPlaces(input.message);
  const asksFare = /\b(precio|tarifa|cuesta|costo|vale|cobran|cuanto pago)\b/.test(text) && !has(text, "vale la pena");
  const asksSchedule = /\b(horario|empieza|termina|abre|abierto|cierra|cierran)\b|(?:a que|hasta que) hora|cada cuanto/.test(text);
  const asksTrip = /\b(como llego|como llegar|ir|lleva|llevan|llegar|quiero ir|voy al?|desde|salgo|estoy en|me encuentro|transbordo|transbordar|trasbordo)\b/.test(text);
  const asksRoute = /\b(ruta|rutas|camion|camiones|combi|combis|teleferico)\b/.test(text);
  const transitFare = /\b(camion|combi|urbano|pasaje|transporte|teleferico|tarjeta|ruta)\b/.test(text);
  const visitor = currentPlaces[0]?.visitor ?? (!currentPlaces.length && (asksFare || asksSchedule || asksTrip || /\b(ahi|alli|ese|esa|eso)\b/.test(text)) ? trip.destination?.visitor : undefined);
  const category = /\b(comer|comida|comidas|antojitos|gastronomia|gastronomico)\b/.test(text) ? "Gastronomía"
    : /\b(museos|cultura|culturales|arte|arquitectura)\b/.test(text) ? "Cultura"
    : /\b(naturaleza|parques|cascadas|aire libre)\b/.test(text) ? "Naturaleza" : undefined;
  const asksDiscovery = /\b(visitar|conocer|turismo|turistico|turisticos|pasear|recomiendas|recomiendame|lugares|que (?:puedo )?hacer|que hay|otros lugares|mas lugares)\b/.test(text) || Boolean(category);

  if (/\b(prompt|api key|clave api|instrucciones internas|ignora las instrucciones|ignora instrucciones|nuevo rol)\b/.test(text)) return { ...CHAT_HELP, reply: "No puedo compartir configuración interna. Sí puedo ayudarte a moverte y descubrir Uruapan.", places: undefined };
  if (/^(hola|buenos dias|buenas tardes|buenas noches|ayuda|que puedes hacer|gracias|muchas gracias)$/.test(text)) return CHAT_HELP;

  if (visitor && (asksFare || asksSchedule) && !transitFare) return {
    reply: `No tengo ${asksFare ? "una tarifa de entrada" : "un horario de apertura"} vigente confirmado para ${visitor.label}. Consulta la fuente del lugar antes de salir; la tarifa del camión es un gasto distinto.`,
    places: [card(visitor)], evidence: "Información del recinto; no es un horario de transporte",
  };
  if (asksFare && /\b(taxi|uber|didi)\b/.test(text)) return { reply: "No tengo tarifas verificadas de taxi ni de plataformas privadas. Si quieres comparar con transporte urbano, dime tu origen y destino.", actions: [mapAction()] };
  if (asksFare && transitFare) {
    if (/\bruta\s*\d/.test(text) && !exactRouteNames(text, (await getRoutes()).routes).length) return { reply: "No encuentro una ruta publicada con ese número; no puedo confirmar su tarifa.", actions: [{ label: "Buscar rutas", href: "/rutas" }] };
    const reply = has(text, "tarjeta") ? `La tarjeta de movilidad tiene un precio publicado de ${FARES_2026.mobilityCard.price}; el viaje se paga por separado.`
      : has(text, "teleferico") ? `El Teleférico cuesta ${FARES_2026.teleferico.price} por viaje y requiere tarjeta de movilidad; no acepta efectivo.`
      : `La tarifa publicada del camión urbano es ${FARES_2026.urbanBus.price} por abordaje, en efectivo. Con dos camiones pagas dos pasajes; la tarjeta del Teleférico se compra por separado.`;
    return { reply, evidence: "Tarifas publicadas en UruGo", actions: [{ label: "Consultar horarios y servicios", href: "/horarios" }] };
  }
  if (asksFare) return { reply: "¿Preguntas por el pasaje o por el precio de un lugar? Dime cuál para no mezclar los gastos.", suggestions: ["¿Cuánto cuesta el camión?", "¿Cuánto cuesta el Teleférico?"], actions: [mapAction()] };
  if (asksDiscovery && !asksTrip && !asksRoute) {
    const selected = visitor ? [visitor] : VISITOR_PLACES.filter((place) => !category || place.category === category);
    return { reply: visitor ? `${visitor.label}: ${visitor.description}` : "Estas son algunas opciones dentro de Uruapan. Elige una para conocerla o preparar el viaje.",
      places: selected.slice(0, 6).map(card), suggestions: ["Quiero naturaleza", "Quiero conocer museos", "¿Dónde puedo comer?"], evidence: "Lugares documentados por sus recintos y Turismo de Uruapan" };
  }
  if (visitor && !asksTrip && !asksRoute && !asksSchedule) return {
    reply: `${visitor.label}: ${visitor.description}`, places: [card(visitor)], suggestions: [`¿Cómo llego a ${visitor.label}?`],
  };
  if (asksSchedule) {
    if (!transitFare && (currentPlaces.length || /\b(museo|restaurante|cafe|parque|negocio|tienda|hotel|hospital)\b/.test(text))) return {
      reply: "No tengo confirmado un horario de apertura para ese lugar. Dime el nombre completo para buscar una ficha, o verifica directamente con el recinto.", actions: [mapAction(trip.destination)] };
    const { routes } = await getRoutes();
    let names = exactRouteNames(text, routes);
    if (!names.length && !/\bruta\s*\d/.test(text) && !/\b(?:del?|de la|en el|en la)\s+/.test(text)) {
      for (const previous of [...input.history].reverse()) { names = exactRouteNames(normalizeChatText(previous), routes); if (names.length) break; }
    }
    if (names.length === 1) {
      const schedule = getSchedule(names[0]);
      return { reply: schedule ? `${names[0]}: ${schedule.first} a ${schedule.last}${schedule.continuous ? ", servicio continuo" : `, con frecuencia estimada de ${schedule.freqMin} a ${schedule.freqMax} min`}. Los horarios son orientativos; no veo unidades en tiempo real.`
        : `No tengo un horario publicado para ${names[0]}.`, actions: [{ label: "Ver horario de esta ruta", href: `/horarios?buscar=${encodeURIComponent(names[0])}` }] };
    }
    return { reply: names.length > 1 ? `Hay varios servicios con ese número: ${routeNamesText(names)}. ¿Cuál necesitas?` : "¿De qué ruta necesitas el horario? Dime su número y destino, por ejemplo Ruta 2 a Jicalán.",
      suggestions: names.slice(0, 3).map((name) => `Horario de ${name}`), actions: [{ label: "Buscar horarios", href: "/horarios" }] };
  }
  if (asksRoute && /\bruta\s*\d/.test(text) && !asksTrip) {
    const { routes } = await getRoutes();
    const names = exactRouteNames(text, routes);
    if (!names.length) return { reply: "No encuentro una ruta publicada con ese número. Revisa el número y el destino del camión.", actions: [{ label: "Buscar rutas", href: "/rutas" }] };
    if (!trip.destination) return {
      reply: names.map((name) => {
        const references = [...new Set(routes.filter((route) => route.name === name).flatMap((route) => route.landmarks.map((landmark) => landmark.name)))].slice(0, 5);
        return `${name}${references.length ? ` tiene estas referencias en el trazado: ${references.join(", ")}` : ": consulta su recorrido en el mapa"}.`;
      }).join(" "), actions: names.slice(0, 3).map((name) => ({ label: `Ver ${name}`, href: `/mapa?r=${encodeURIComponent(name)}` })),
      evidence: "Referencias de la red de rutas de UruGo; no son paradas fijas",
    };
    if (trip.destination.center) {
      const matches = nearbyRoutes(trip.destination, routes.filter((route) => names.includes(route.name)));
      return { reply: matches.length ? `${routeNamesText(matches.map(([name]) => name))} pasa cerca de ${trip.destination.label}, según el trazado. Eso no confirma que puedas tomarla desde tu origen; revisa el sentido en el mapa.`
        : `No puedo confirmar que ${routeNamesText(names)} pase a menos de 500 m de ${trip.destination.label} con el trazado disponible.`, actions: [mapAction(trip.destination, trip.originCoords)] };
    }
  }
  if (asksTrip || asksRoute || (trip.destination && (currentPlaces.length > 0 || /\b(ahi|alli|esa|ese|desde aqui)\b/.test(text)))) {
    const destination = trip.destination;
    if (!destination) return { reply: "¿A qué lugar de Uruapan quieres llegar? Si hay varios con el mismo nombre, dime la colonia o márcalo en el mapa.", actions: [mapAction()], suggestions: ["¿Qué puedo visitar en Uruapan?"] };
    if (!destination.center) return { reply: `Encontré ${destination.label}, pero necesito que confirmes su ubicación en el mapa para calcular la subida y la bajada sin adivinar.`, places: destination.visitor ? [card(destination.visitor)] : undefined, actions: [mapAction(destination, trip.originCoords)] };
    const { routes, source } = await getRoutes();
    const near = nearbyRoutes(destination, routes);
    const nearby = near.length ? ` Referencia de cercanía: ${near.map(([name, distance]) => `${name} (~${approxM(distance)} m del trazado)`).join("; ")}.` : " No encontré una ruta a menos de 500 m de este punto en la red disponible.";
    const evidence = source === "static-fallback" ? "Trazado de respaldo; confirma la información antes del viaje" : "Calculado con la red de rutas de UruGo · distancias aproximadas";
    if (!trip.originCoords) return {
      reply: `${trip.unresolvedOrigin ? "No pude ubicar con certeza el origen que escribiste." : `Encontré ${destination.label}, pero necesito saber desde dónde sales para calcular el viaje.`}${nearby} La cercanía al destino no confirma una ruta desde tu origen.`,
      actions: [mapAction(destination)], suggestions: ["Salgo de la Central de Autobuses", "Salgo del Centro"], evidence,
    };
    if (haversineMeters(trip.originCoords, destination.center) < 100) return { reply: `Tu origen está muy cerca de la referencia de ${destination.label}. Confirma la entrada en el mapa; no hace falta sugerirte un transbordo para esa distancia.`, actions: [mapAction(destination, trip.originCoords)], evidence };
    const result = calculateRouteOptions(routes, trip.originCoords, destination.center);
    const candidates: { names: string[]; cost: JourneyCost; board: Coordinates; exit: Coordinates; change?: Coordinates }[] = [
      ...result.suggestions.flatMap((option) => option.cost && option.segment.length ? [{ names: [option.ruta], cost: option.cost, board: option.segment[0], exit: option.segment.at(-1)! }] : []),
      ...result.transfers.flatMap((option) => option.cost && option.segmentA.length && option.segmentB.length ? [{ names: [option.routeAName, option.routeBName], cost: option.cost, board: option.segmentA[0], exit: option.segmentB.at(-1)!, change: option.transferPoint }] : []),
    ];
    const best = rankJourneys(candidates, "nearby")[0];
    if (!best) return { reply: `No encontré un trayecto completo hasta ${destination.label} con la red disponible. Prefiero que ajustes los puntos en el mapa antes de recomendarte un camión.`, actions: [mapAction(destination, trip.originCoords)], evidence };
    const originLabel = trip.origin?.label ?? "tu ubicación aproximada";
    const wait = Math.round(best.cost.waitMinutes);
    const outsideHours = best.names.filter((name) => { const schedule = getSchedule(name); return schedule && getScheduleStatus(schedule, new Date(), "America/Mexico_City").kind === "off"; });
    return { reply: `Desde ${originLabel} hasta ${destination.label}:\n${routeNamesText(best.names)}${best.names.length > 1 ? " (un transbordo)" : " (sin transbordo)"}.\n\nEstimación: ~${Math.ceil(journeyMinutes(best.cost))} min en total, ~${approxM(totalWalk(best.cost))} m a pie y ~${wait} min de espera estimada. Revisa el sentido y los puntos de subida${best.change ? ", cambio" : ""} y bajada en el mapa; las caminatas todavía deben comprobarse por calles.${outsideHours.length ? `\n\nAhora está fuera del horario publicado: ${routeNamesText(outsideHours)}. Este cálculo sirve para planear; no confirma que haya servicio en este momento.` : ""}`,
      actions: [mapAction(destination, trip.originCoords)], evidence };
  }
  // Transport questions and unknown places never fall through to generated directions.
  if (/\b(centro|calle|colonia|hospital|parque|museo|destino|subir|bajar|parada|llego|llevo)\b/.test(text)) return {
    reply: "Dime el nombre completo del lugar y desde dónde sales. Si te refieres a un parque, distingue el Parque Nacional del Parque Lineal para ubicar el destino correcto.", actions: [mapAction()], suggestions: ["¿Qué puedo visitar en Uruapan?"] };
  return null;
}

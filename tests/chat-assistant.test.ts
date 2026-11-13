import { describe, expect, it, vi } from "vitest";
import { buildChatAnswer, chatMapHref, findChatPlaces, resolveChatTrip, type ChatInput } from "@/lib/chat-assistant";
import { VISITOR_PLACES } from "@/lib/chat-places";
import { parseChatIntent } from "@/lib/chat-response";
import { safeChatHref } from "@/lib/chat-types";
import routeData from "@/data/rutas_produccion_final.json";
import type { ProductionRoute } from "@/lib/types";
const realRoutes = routeData as ProductionRoute[];
const input = (message: string, history: string[] = [], location: ChatInput["location"] = null): ChatInput => ({ message, history, location });
const load = async () => ({ routes: realRoutes, source: "static" });

describe("asistente local con evidencia", () => {
  it("ofrece turismo sin consultar rutas, Mapbox ni un modelo", async () => {
    const loader = vi.fn(load);
    const result = await buildChatAnswer(input("¿Qué puedo visitar en Uruapan?"), loader);
    expect(result?.places).toHaveLength(6);
    expect(result?.places?.map((place) => place.title)).toContain("Museo Indígena La Huatápera");
    expect(loader).not.toHaveBeenCalled();
    expect(result?.places?.every((place) => safeChatHref(place.source.href))).toBe(true);
  });
  it.each(["¿Cuánto cuesta entrar al Parque Nacional?", "¿A qué hora abre La Huatápera?"])("separa el recinto del transporte: %s", async (message) => {
    const result = await buildChatAnswer(input(message), load);
    expect(result?.reply).toContain("vigente confirmado");
    expect(result?.reply).not.toContain("$12");
    expect(result?.places).toHaveLength(1);
  });
  it("resuelve el precio posterior a un museo como entrada, no como pasaje", async () => {
    const result = await buildChatAnswer(input("¿Y cuánto cuesta?", ["Quiero conocer La Huatápera"]), load);
    expect(result?.reply).toContain("tarifa de entrada");
  });
  it.each(["Cuánto cuesta", "Cuánto cuesta un taxi al Centro", "Cuánto cuesta comer en el Centro", "Cuánto cuesta la Ruta 999"])("no aplica el pasaje urbano a un precio desconocido: %s", async (message) => {
    expect((await buildChatAnswer(input(message), load))?.reply).not.toContain("$12");
  });
  it("no atribuye el horario anterior de un camión a un negocio", async () => {
    const result = await buildChatAnswer(input("A qué hora abre el restaurante desconocido", ["Horario de la Ruta 2"]), load);
    expect(result?.reply).not.toContain("05:15");
    expect(result?.reply).toContain("horario de apertura");
  });
  it("permite cambiar de tema y filtrar naturaleza, cultura y comida", async () => {
    const result = await buildChatAnswer(input("Quiero naturaleza", ["Qué es La Huatápera"]), load);
    expect(result?.places?.every((place) => place.category === "Naturaleza")).toBe(true);
    const food = await buildChatAnswer(input("¿Dónde puedo comer?"), load);
    expect(food?.places?.[0].title).toBe("Mercado de Antojitos");
  });
  it("no confunde el Parque Nacional con el Lineal ni acepta un parque ambiguo", async () => {
    expect(findChatPlaces("Parque Nacional")[0].label).toContain("Barranca");
    expect(findChatPlaces("Parque Lineal")[0].label).not.toContain("Barranca");
    const result = await buildChatAnswer(input("¿Cómo llego al parque?"), load);
    expect(result?.reply).toContain("varios con el mismo nombre");
    expect(result?.actions?.[0].href).toBe("/mapa");
    expect(findChatPlaces("supercentromuseoinventado")).toEqual([]);
  });
  it("conserva el destino al responder el origen en otro mensaje", () => {
    const trip = resolveChatTrip(input("Salgo de la Central de Autobuses", ["¿Cómo llego al Parque Nacional?"]));
    expect(trip.destination?.label).toContain("Barranca");
    expect(trip.origin?.label).toBe("Central de Autobuses");
  });
  it("entiende un destino breve después de indicar el origen", async () => {
    const result = await buildChatAnswer(input("Y para el Centro", ["Salgo de la Central de Autobuses"]), load);
    expect(result?.reply).toContain("Desde Central de Autobuses hasta Centro");
  });
  it("preguntar solo Centro pide el origen sin inventar un viaje", async () => {
    const result = await buildChatAnswer(input("Centro"), load);
    expect(result?.reply).toContain("necesito saber desde dónde sales");
    expect(result?.reply).not.toContain("sin transbordo");
  });
  it.each(["Desde la Central de Autobuses al Parque Nacional", "Quiero ir de la Central de Autobuses al Parque Nacional", "Cómo llego al Parque Nacional desde la Central de Autobuses"])("separa origen y destino en: %s", (message) => {
    const trip = resolveChatTrip(input(message));
    expect(trip.destination?.label).toContain("Barranca");
    expect(trip.origin?.label).toBe("Central de Autobuses");
  });
  it("un origen desconocido explícito no se reemplaza silenciosamente por el GPS", () => {
    const trip = resolveChatTrip(input("Desde una colonia inventada al Parque Nacional", [], { lng: -102.04, lat: 19.42 }));
    expect(trip.originCoords).toBeUndefined();
    expect(trip.unresolvedOrigin).toBe(true);
  });
  it("desde aquí utiliza el GPS solo cuando se compartió", () => {
    const point = { lng: -102.04, lat: 19.42 };
    expect(resolveChatTrip(input("Desde aquí al Parque Nacional", [], point)).originCoords).toEqual([-102.04, 19.42]);
    expect(resolveChatTrip(input("Desde aquí al Parque Nacional")).originCoords).toBeUndefined();
  });
  it("no confunde un aeropuerto con la estación ni un centro comercial con el Centro", () => {
    expect(findChatPlaces("Cómo llego al aeropuerto")).not.toContainEqual(expect.objectContaining({ label: "Libramiento Aeropuerto" }));
    expect(findChatPlaces("Cómo llego a un centro comercial desconocido")).not.toContainEqual(expect.objectContaining({ label: "Centro" }));
  });
  it("no reutiliza un destino anterior si el nuevo es desconocido", () => {
    expect(resolveChatTrip(input("Cómo llego a una escuela inventada", ["Voy al Parque Nacional"])).destination).toBeUndefined();
    expect(resolveChatTrip(input("Desde la Central de Autobuses a un museo inventado", ["Voy al Parque Nacional"])).destination).toBeUndefined();
  });
  it("vale la pena no se interpreta como una pregunta de precio", async () => {
    const result = await buildChatAnswer(input("¿Vale la pena conocer la Fábrica de San Pedro?"), load);
    expect(result?.reply).not.toContain("tarifa de entrada");
    expect(result?.places?.[0].category).toBe("Cultura");
  });
  it("calcula un viaje con la red real y mantiene los dos puntos en la acción", async () => {
    const result = await buildChatAnswer(input("Salgo de la Central de Autobuses", ["Cómo llego al Parque Nacional"]), load);
    expect(result?.reply).toContain("Desde Central de Autobuses");
    expect(result?.reply).toContain("espera estimada");
    const url = new URL(result!.actions![0].href!, "http://localhost");
    expect(url.searchParams.get("a")).toBe("-102.042340,19.426870");
    expect(url.searchParams.get("b")).toBe("-102.071525,19.424195");
  });
  it("avisa si el viaje calculado queda fuera del horario publicado en Uruapan", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-14T09:00:00Z"));
    try {
      const result = await buildChatAnswer(input("Desde la Central de Autobuses al Parque Nacional"), load);
      expect(result?.reply).toContain("fuera del horario publicado");
      expect(result?.reply).toContain("no confirma que haya servicio");
    } finally { vi.useRealTimers(); }
  });
  it("pide confirmar lugares cuya ubicación exacta no se ha verificado", async () => {
    const result = await buildChatAnswer(input("Cómo llego a la Huatápera", [], { lng: -102.04, lat: 19.42 }), load);
    expect(result?.reply).toContain("confirmes su ubicación");
    const url = new URL(result!.actions![0].href!, "http://localhost");
    expect(url.searchParams.get("b")).toBeNull();
    expect(url.searchParams.get("destino")).toContain("Huatápera");
  });
  it("no vuelve a afirmar que la Ruta 2 pasa por el Centro", async () => {
    const result = await buildChatAnswer(input("¿La Ruta 2 pasa por el Centro?"), load);
    expect(result?.reply).toContain("No puedo confirmar");
    expect(result?.reply).toContain("500 m");
  });
  it("mide distancia al segmento y no solo a vértices lejanos", async () => {
    const route: ProductionRoute = { ...realRoutes[0], id: 9999, name: "Ruta de prueba geométrica", path: [[-102.08,19.42101], [-102.05,19.42101]] };
    const result = await buildChatAnswer(input("Qué ruta pasa por el Centro"), async () => ({ routes: [route], source: "static" }));
    expect(result?.reply).toContain("Ruta de prueba geométrica");
  });
  it("el Teleférico requiere proximidad a una estación, no a cualquier punto del cable", async () => {
    const route: ProductionRoute = { ...realRoutes[0], name: "Teleférico Uruapan", path: [[-102.08,19.42101], [-102.05,19.42101]] };
    const result = await buildChatAnswer(input("Qué ruta pasa por el Centro"), async () => ({ routes: [route], source: "static" }));
    expect(result?.reply).not.toContain("Teleférico");
  });
  it("distingue el horario de la Ruta 2 y la 2A y entiende la pregunta siguiente", async () => {
    const route2 = await buildChatAnswer(input("Horario de la Ruta 2"), load);
    expect(route2?.reply).toContain("Ruta 2:"); expect(route2?.reply).not.toContain("Ruta 2A");
    const follow = await buildChatAnswer(input("Y cada cuánto pasa", ["Horario de la Ruta 2A"]), load);
    expect(follow?.reply).toContain("Ruta 2A:");
  });
  it("no inventa servicios inexistentes ni una opción si no hay red", async () => {
    const invalid = await buildChatAnswer(input("Por dónde pasa la Ruta 999"), load);
    expect(invalid?.reply).toContain("No encuentro una ruta publicada");
    const missing = await buildChatAnswer(input("Desde la Central de Autobuses al Parque Nacional"), async () => ({ routes: [], source: "static-fallback" }));
    expect(missing?.reply).toContain("No encontré un trayecto completo");
    expect(missing?.evidence).toContain("respaldo");
  });
  it("el catálogo no añade precios de entrada ni horarios supuestos", () => {
    expect(VISITOR_PLACES.every((place) => place.checkedAt === "2026-11-13")).toBe(true);
    expect(JSON.stringify(VISITOR_PLACES)).not.toMatch(/\$\d|\d\d:\d\d/);
  });
  it("acepta solo intenciones conocidas de la IA y enlaces de nuestros datos", () => {
    expect(parseChatIntent('{"intent":"nature"}')).toBe("nature");
    expect(parseChatIntent('{"intent":"visit","directions":"Toma la Ruta 2"}')).toBeNull();
    expect(parseChatIntent('Toma la Ruta 2')).toBeNull();
    expect(parseChatIntent('{"intent":"inventar_ruta"}')).toBeNull();
    expect(safeChatHref("javascript:alert(1)")).toBeUndefined();
    expect(safeChatHref("//evil.test/mapa")).toBeUndefined();
    expect(safeChatHref("https://uruapan.gob.mx.evil.test")).toBeUndefined();
    expect(safeChatHref(chatMapHref())).toBe("/mapa");
  });
});

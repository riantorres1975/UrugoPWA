import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OFFLINE_JOURNEYS_KEY, OFFLINE_JOURNEYS_EVENT, readOfflineJourneys, saveOfflineJourney, removeOfflineJourney } from "@/lib/offline-journey-storage";

let storage: Map<string, string>;
const entry = { id: "direct:1:centro", title: "Ruta al Centro", html: "<!doctype html><h1>Tu viaje</h1>" };
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

describe("viajes disponibles sin conexión", () => {
  it("actualiza un viaje guardado sin duplicarlo y avisa a la interfaz", () => {
    const listener = vi.fn();
    window.addEventListener(OFFLINE_JOURNEYS_EVENT, listener);
    saveOfflineJourney(entry);
    saveOfflineJourney({ ...entry, title: "Ruta actualizada" });
    expect(readOfflineJourneys()).toEqual([expect.objectContaining({ title: "Ruta actualizada", html: entry.html })]);
    expect(listener).toHaveBeenCalledTimes(2);
    removeOfflineJourney(entry.id);
    expect(readOfflineJourneys()).toEqual([]);
  });
  it("mantiene los viajes anteriores cuando se llena el almacenamiento", () => {
    saveOfflineJourney(entry);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: () => { throw new Error("QuotaExceededError"); },
    });
    expect(() => saveOfflineJourney({ ...entry, id: "otro" })).toThrow("No hay espacio");
    expect(readOfflineJourneys()).toHaveLength(1);
  });
  it("no descarta viajes anteriores cuando se alcanza el límite", () => {
    for (let index = 0; index < 10; index++) saveOfflineJourney({ ...entry, id: String(index) });
    expect(() => saveOfflineJourney({ ...entry, id: "nuevo" })).toThrow("Ya tienes 10");
    expect(readOfflineJourneys()).toHaveLength(10);
    saveOfflineJourney({ ...entry, id: "0" });
    expect(readOfflineJourneys()[0].id).toBe("0");
  });
  it("descarta datos corruptos y fichas demasiado grandes", () => {
    storage.set(OFFLINE_JOURNEYS_KEY, JSON.stringify([{ ...entry, savedAt: "ayer" }, { ...entry, savedAt: 100, html: "incompleto" }]));
    expect(readOfflineJourneys()).toEqual([]);
    expect(() => saveOfflineJourney({ ...entry, html: "x".repeat(500_001) })).toThrow("muy grande");
  });
});

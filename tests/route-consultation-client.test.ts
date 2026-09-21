import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "urugo:route-consultations:v1";
const input = { routeName: "Ruta 17", source: "map" as const };

describe("registro de consultas en el navegador", () => {
  let storage: Map<string, string>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    storage = new Map();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  // Flush the fetch/confirmation/finally chain without real timers.
  async function settle() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }

  it("deduplica solicitudes concurrentes y consultas confirmadas tras recargar", async () => {
    let finish!: (value: { ok: boolean }) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const { trackRouteConsultation } = await import("@/lib/route-consultation-client");
    trackRouteConsultation(input);
    trackRouteConsultation(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.has(STORAGE_KEY)).toBe(false);
    finish({ ok: true });
    await settle();
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toHaveLength(1);

    vi.resetModules();
    const reloaded = await import("@/lib/route-consultation-client");
    reloaded.trackRouteConsultation(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["network", "server"])("permite otra selección después de fallar: %s", async (failure) => {
    if (failure === "network") fetchMock.mockRejectedValueOnce(new Error("Offline"));
    else fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    const { trackRouteConsultation } = await import("@/lib/route-consultation-client");
    trackRouteConsultation(input);
    await settle();
    expect(storage.has(STORAGE_KEY)).toBe(false);
    trackRouteConsultation(input);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.get(STORAGE_KEY)!)).toHaveLength(1);
  });

  it("cuenta rutas distintas y permite una nueva consulta al día siguiente", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-21T12:00:00Z"));
      const { trackRouteConsultation } = await import("@/lib/route-consultation-client");
      trackRouteConsultation(input);
      trackRouteConsultation({ routeName: "Ruta 45", source: "map" });
      await settle();
      vi.setSystemTime(new Date("2026-09-22T12:00:00Z"));
      trackRouteConsultation(input);
      await settle();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

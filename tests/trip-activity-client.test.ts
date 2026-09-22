import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const key = "urugo-trip-activity-outbox-v1";
const event = () => ({ id: "46ed4c46-a5d7-4988-80d2-b9b5fdc96765", routes: ["Ruta 17"], startedAt: new Date().toISOString(), arrived: false });
let storage: Map<string, string>;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("cola de actividad", () => {
  it("reintenta el mismo viaje tras fallo y recarga", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const client = await import("@/lib/trip-activity-client");
    const start = event();
    client.enqueueTripActivity(start);
    await client.flushTripActivity();
    expect(JSON.parse(storage.get(key)!)).toEqual([start]);
    vi.resetModules();
    await (await import("@/lib/trip-activity-client")).flushTripActivity();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(start);
    expect(JSON.parse(storage.get(key)!)).toEqual([]);
  });
  it("no pierde la llegada que se confirma mientras se guarda el inicio", async () => {
    let finish!: (value: { ok: boolean }) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const client = await import("@/lib/trip-activity-client");
    const start = event();
    client.enqueueTripActivity(start);
    client.enqueueTripActivity({ ...start, arrived: true });
    client.enqueueTripActivity(start);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish({ ok: true });
    await client.flushTripActivity();
    await client.flushTripActivity();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).arrived).toBe(true);
    expect(JSON.parse(storage.get(key)!)).toEqual([]);
  });
  it("descarta eventos caducados sin enviarlos", async () => {
    storage.set(key, JSON.stringify([{ ...event(), startedAt: "2020-01-01T00:00:00Z" }]));
    await (await import("@/lib/trip-activity-client")).flushTripActivity();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Coordinates } from "@/lib/types";
import { parseWalkingDirections } from "@/lib/walking-directions";

const from: Coordinates = [-102.06, 19.42], to: Coordinates = [-102.059, 19.42];
const response = { code: "Ok", routes: [{ distance: 210, duration: 180, geometry: { type: "LineString", coordinates: [from, [-102.0595, 19.4205], to] } }] };

describe("walking directions", () => {
  beforeEach(() => { vi.resetModules(); vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "test-token"); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("uses street geometry, distance and duration, not the straight-line shortcut", () => {
    const leg = parseWalkingDirections(response, from, to)!;
    expect(leg).toMatchObject({ status: "street", distanceM: 210, minutes: 3 });
    expect(leg.coordinates).toHaveLength(3);
  });
  it("distinguishes an impossible connection from a missing segment or malformed response", () => {
    expect(parseWalkingDirections({ code: "NoRoute" }, from, to)?.status).toBe("unreachable");
    expect(parseWalkingDirections({ code: "NoSegment" }, from, to)).toBeNull();
    expect(parseWalkingDirections({ ...response, routes: [{ ...response.routes[0], distance: -5 }] }, from, to)).toBeNull();
    expect(parseWalkingDirections(response, [-102.08, 19.42], to)).toBeNull();
  });
  it("reuses a checked leg without another request", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(response));
    vi.stubGlobal("fetch", fetch);
    const { getWalkingDirections } = await import("@/lib/walking-directions");
    const signal = new AbortController().signal;
    await getWalkingDirections(from, to, signal);
    await getWalkingDirections(from, to, signal);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/mapbox/walking/");
    expect(url.searchParams.get("walking_speed")).toBe("1.25");
  });
  it("falls back without network access offline and pauses after quota errors", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    const { getWalkingDirections } = await import("@/lib/walking-directions");
    const signal = new AbortController().signal;
    vi.stubGlobal("navigator", { onLine: false });
    expect((await getWalkingDirections(from, to, signal)).status).toBe("approximate");
    expect(fetch).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { onLine: true });
    await getWalkingDirections(from, to, signal);
    await getWalkingDirections(to, from, signal);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not treat a cancelled calculation as a valid fallback", async () => {
    const controller = new AbortController(); controller.abort();
    const { getWalkingDirections } = await import("@/lib/walking-directions");
    await expect(getWalkingDirections(from, to, controller.signal)).rejects.toThrow();
  });
});

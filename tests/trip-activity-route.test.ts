import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ db: vi.fn(), rpc: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: () => "203.0.113.12", rateLimit: mocks.rate }));
import { POST } from "@/app/api/analytics/trip-activity/route";
const event = () => ({ id: "46ed4c46-a5d7-4988-80d2-b9b5fdc96765", routes: ["Ruta 17", "Ruta 45"], startedAt: new Date().toISOString(), arrived: true });
const request = (body: unknown, headers = {}) => new NextRequest("https://www.urugo.app/api/analytics/trip-activity", {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.db.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ error: null }); mocks.rate.mockResolvedValue(true);
});
describe("API de actividad", () => {
  it("guarda un transbordo como un viaje con dos rutas", async () => {
    const body = event();
    expect((await POST(request(body))).status).toBe(204);
    expect(mocks.rpc).toHaveBeenCalledWith("record_trip_activity", {
      p_id: body.id, p_started_at: body.startedAt, p_arrived: true,
      p_route_keys: ["ruta-17-purhepechas", "ruta-45-interclinicas"],
    });
  });
  it("rechaza origen externo, exceso de tamaño, rutas desconocidas y abuso", async () => {
    expect((await POST(request(event(), { origin: "https://example.com" }))).status).toBe(403);
    expect((await POST(request({ ...event(), extra: "x".repeat(2000) }))).status).toBe(413);
    expect((await POST(request({ ...event(), routes: ["Ruta 999"] }))).status).toBe(400);
    mocks.rate.mockResolvedValue(false);
    expect((await POST(request(event()))).status).toBe(429);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("permite reintentar si la base falla", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "unavailable" } });
    expect((await POST(request(event()))).status).toBe(503);
    mocks.db.mockReturnValue(null);
    expect((await POST(request(event()))).status).toBe(503);
  });
});

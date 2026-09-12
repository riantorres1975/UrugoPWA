import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn(), rateLimit: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: () => "203.0.113.12", rateLimit: mocks.rateLimit }));
vi.mock("@/lib/community-submission", () => ({ hashSubmitter: () => "a".repeat(32) }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));
import { POST } from "@/app/api/community/journey-feedback/route";

const payload = { deviceId: "00f5d066-1e55-49ca-bdb2-19fda6c8d4bf", routes: ["Ruta 17"], useful: true };
const request = (body: unknown = payload, headers: Record<string, string> = {}) => new NextRequest("https://www.urugo.app/api/community/journey-feedback", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("POST journey-feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue(true);
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  });
  it("guarda claves canónicas y no envía coordenadas ni el identificador original", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("record_journey_feedback", { p_route_keys: ["ruta-17-purhepechas"], p_route_names: ["Ruta 17"], p_device_hash: "a".repeat(32), p_useful: true, p_reason: null });
  });
  it("conserva el orden del transbordo y su motivo", async () => {
    expect((await POST(request({ ...payload, routes: ["Ruta 26", "Ruta 85"], useful: false, reason: "transfer_far" }))).status).toBe(200);
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_route_names: ["Ruta 26", "Ruta 85"], p_useful: false, p_reason: "transfer_far" });
  });
  it("rechaza rutas inexistentes, cargas grandes y otros orígenes", async () => {
    expect((await POST(request({ ...payload, routes: ["inventada"] }))).status).toBe(400);
    expect((await POST(request({ ...payload, extra: "x".repeat(1600) }))).status).toBe(413);
    expect((await POST(request(payload, { origin: "https://example.com" }))).status).toBe(403);
    expect((await POST(request(payload, { "content-type": "text/plain" }))).status).toBe(415);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("informa fallos de guardado y aplica límites", async () => {
    mocks.rateLimit.mockResolvedValueOnce(false);
    expect((await POST(request())).status).toBe(429);
    mocks.createSupabaseAdminClient.mockReturnValueOnce(null);
    expect((await POST(request())).status).toBe(503);
    mocks.rpc.mockResolvedValueOnce({ error: { message: "offline" } });
    expect((await POST(request())).status).toBe(502);
  });
});

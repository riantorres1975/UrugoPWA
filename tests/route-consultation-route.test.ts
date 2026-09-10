import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rateLimit: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: () => "203.0.113.12",
  rateLimit: mocks.rateLimit,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { POST } from "@/app/api/analytics/route-consultation/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://www.urugo.app/api/analytics/route-consultation", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analytics/route-consultation", () => {
  beforeEach(() => {
    mocks.rateLimit.mockReset();
    mocks.rateLimit.mockResolvedValue(true);
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.createSupabaseAdminClient.mockReset();
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it("incrementa el total usando la clave canónica", async () => {
    const response = await POST(request({ routeName: "Ruta 17", source: "map" }));

    expect(response.status).toBe(204);
    expect(mocks.rpc).toHaveBeenCalledWith("record_route_consultation", {
      p_route_key: "ruta-17-purhepechas",
      p_source: "map",
    });
  });

  it("descarta silenciosamente la medición si Supabase no está disponible", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(null);

    const response = await POST(request({
      routeKey: "ruta-176-quinta-clinica-76",
      source: "route_page",
    }));

    expect(response.status).toBe(204);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rechaza datos desconocidos y solicitudes de otro origen", async () => {
    const invalid = await POST(request({ routeName: "Ruta 999", source: "map" }));
    const crossSite = await POST(request(
      { routeName: "Ruta 17", source: "map" },
      { origin: "https://example.com", "sec-fetch-site": "cross-site" },
    ));

    expect(invalid.status).toBe(400);
    expect(crossSite.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("limita el abuso antes de escribir en la base", async () => {
    mocks.rateLimit.mockResolvedValue(false);

    const response = await POST(request({ routeName: "Ruta 17", source: "map" }));

    expect(response.status).toBe(429);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

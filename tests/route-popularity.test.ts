import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

import { getPopularRoutes } from "@/lib/route-popularity";

describe("ranking de rutas", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.createSupabaseAdminClient.mockReset();
  });

  it("usa la actividad real cuando hay suficientes rutas válidas", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        { route_key: "ruta-17-purhepechas", consultation_count: 40 },
        { route_key: "ruta-176-quinta-clinica-76", consultation_count: 30 },
        { route_key: "ruta-10-charanda", consultation_count: 20 },
        { route_key: "ruta-45-interclinicas", consultation_count: 10 },
      ],
      error: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });

    const result = await getPopularRoutes(4);

    expect(result.basedOnUsage).toBe(true);
    expect(result.routes.map((route) => route.name)).toEqual([
      "Ruta 17",
      "Ruta 176",
      "Ruta 10",
      "Ruta 45",
    ]);
  });

  it("usa la selección inicial si todavía no hay cuatro rutas", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ route_key: "ruta-17-purhepechas", consultation_count: 2 }],
      error: null,
    });
    mocks.createSupabaseAdminClient.mockReturnValue({ rpc: mocks.rpc });

    const result = await getPopularRoutes(4);

    expect(result.basedOnUsage).toBe(false);
    expect(result.routes.map((route) => route.name)).toEqual([
      "Ruta 176",
      "Ruta 17",
      "Ruta 45",
      "Ruta 10",
    ]);
  });
});

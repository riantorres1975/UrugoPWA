import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAdminRouteSignals } from "@/lib/admin-route-signals";

describe("señales del inventario", () => {
  it("supera el límite de mil filas sin perder las señales de la segunda página", async () => {
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), abortSignal: vi.fn() };
    query.abortSignal.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })), error: null, count: 1001 })
      .mockResolvedValueOnce({ data: [{ id: "1000", route_name: "Ruta 26", confirmation_type: "changed" }], error: null, count: 1001 });
    const result = await loadAdminRouteSignals({ from: () => query } as unknown as SupabaseClient);
    expect(result.data).toHaveLength(1001);
    expect(result.incomplete).toBe(false);
    expect(result.data.at(-1)?.route_name).toBe("Ruta 26");
    expect(query.range).toHaveBeenLastCalledWith(1000, 1999);
  });
  it("avisa si falla la consulta o se alcanza el máximo y no afirma que no haya alertas", async () => {
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockResolvedValue({ data: null, error: { message: "network" }, count: null }) };
    const db = { from: () => query } as unknown as SupabaseClient;
    expect(await loadAdminRouteSignals(db)).toEqual({ data: [], incomplete: true, failed: true });
    query.abortSignal.mockImplementation(async () => ({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `${query.abortSignal.mock.calls.length}-${i}` })), error: null, count: 6000 }));
    expect(await loadAdminRouteSignals(db)).toMatchObject({ incomplete: true, failed: false });
    expect(query.range).toHaveBeenLastCalledWith(4000, 4999);
  });
  it("se adapta si la API limita cada respuesta a menos de mil filas", async () => {
    const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(), abortSignal: vi.fn() };
    query.abortSignal.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: String(i) })), error: null, count: 501 })
      .mockResolvedValueOnce({ data: [{ id: "500" }], error: null, count: 501 });
    expect((await loadAdminRouteSignals({ from: () => query } as unknown as SupabaseClient)).data).toHaveLength(501);
    expect(query.range).toHaveBeenLastCalledWith(500, 1499);
  });
});

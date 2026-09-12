import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.client }));
vi.mock("@/components/admin/AdminHeader", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import JourneyOpinionsPage from "@/app/admin/feedback/page";

describe("administración de opiniones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ status: "admin", email: "admin@example.com" });
    mocks.client.mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockResolvedValue({ data: { groups: [], previous: { total: 0, positive: 0 } }, error: null });
  });
  it("requiere permiso de administrador antes de consultar opiniones", async () => {
    for (const status of ["anonymous", "denied"]) {
      mocks.access.mockResolvedValue({ status });
      await expect(JourneyOpinionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect:/admin");
    }
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("distingue el estado vacío de un fallo de Supabase", async () => {
    const empty = renderToStaticMarkup(await JourneyOpinionsPage({ searchParams: Promise.resolve({}) }));
    expect(empty).toContain("Aún no hay opiniones");
    mocks.rpc.mockResolvedValue({ error: { message: "private connection detail" }, data: null });
    const failed = renderToStaticMarkup(await JourneyOpinionsPage({ searchParams: Promise.resolve({}) }));
    expect(failed).toContain("No se pudieron cargar");
    expect(failed).not.toContain("Aún no hay opiniones");
    expect(failed).not.toContain("private connection detail");
  });
  it("muestra porcentajes, motivos y comparación desde todos los registros agregados", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: { groups: [{ route_keys: ["ruta-a", "ruta-b"], route_names: ["Ruta 26", "Ruta 85"], total: 4, positive: 3, negative: 1, transfer_far: 1, bus_missing: 0, route_incorrect: 0, other: 0, unspecified: 0 }], previous: { total: 2, positive: 1 } } });
    const html = renderToStaticMarkup(await JourneyOpinionsPage({ searchParams: Promise.resolve({ desde: "2026-09-01", hasta: "2026-09-10" }) }));
    expect(html).toContain("75%");
    expect(html).toContain("+25 puntos porcentuales");
    expect(html).toContain("El transbordo está lejos");
    expect(html).toContain("Muestra pequeña");
    expect(mocks.rpc).toHaveBeenCalledWith("journey_feedback_summary", { p_from: "2026-09-01T00:00:00-06:00", p_until: "2026-09-11T00:00:00-06:00" });
  });
});

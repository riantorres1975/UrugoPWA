import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
import { GET } from "@/app/api/admin/support/inbox/route";
beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue({ status: "admin" }); mocks.read.mockResolvedValue({ data: [{ updated_at: "2026-11-13T17:00:00Z" }], count: 2, error: null }); const chain = { or: () => chain, order: () => chain, limit: () => chain, abortSignal: mocks.read }; mocks.db.mockReturnValue({ from: () => ({ select: () => chain }) }); });
describe("aviso de pendientes", () => {
  it("solo los administradores pueden consultar el contador", async () => {
    mocks.access.mockResolvedValueOnce({ status: "denied" });
    expect((await GET(new NextRequest("https://www.urugo.app/api/admin/support/inbox"))).status).toBe(403);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("devuelve conteo y fecha sin referencias, nombres o montos", async () => {
    const result = await GET(new NextRequest("https://www.urugo.app/api/admin/support/inbox"));
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(await result.json()).toEqual({ count: 2, latest: "2026-11-13T17:00:00Z" });
  });
});

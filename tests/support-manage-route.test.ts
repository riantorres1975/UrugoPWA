import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ db: vi.fn(), from: vi.fn(), rpc: vi.fn(), read: vi.fn(), update: vi.fn(), rateLimit: vi.fn(), revalidate: vi.fn(), eq: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: () => "203.0.113.12", rateLimit: mocks.rateLimit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { POST } from "@/app/api/support/manage/route";
const code = "UG-" + "ab".repeat(24);
const record = { status: "confirmed", publication_status: "approved", visibility: "anonymous", display_name: null, show_amount: false, amount_cents: 5000, revision: 2, created_at: "2026-11-13T16:00:00Z", confirmed_at: "2026-11-13T17:00:00Z", payment_reference: "DO-NOT-EXPOSE", management_hash: "private-hash", moderator_note: "private" };
const request = (body: unknown = { action: "status", code }, headers: Record<string, string> = {}) => new NextRequest("https://www.urugo.app/api/support/manage", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mocks.rateLimit.mockResolvedValue(true); mocks.read.mockResolvedValue({ data: record, error: null }); mocks.update.mockResolvedValue({ error: null }); const chain = { eq: mocks.eq, abortSignal: () => chain, maybeSingle: mocks.read }; mocks.eq.mockReturnValue(chain); mocks.from.mockReturnValue({ select: () => chain }); mocks.rpc.mockReturnValue({ abortSignal: mocks.update }); mocks.db.mockReturnValue({ from: mocks.from, rpc: mocks.rpc }); });
describe("consulta privada del aporte", () => {
  it("consulta con hash y devuelve solo los campos personales autorizados", async () => {
    const response = await POST(request()); expect(response.headers.get("Cache-Control")).toContain("no-store");
    const body = await response.json(); expect(body.receipt.amount_cents).toBe(5000);
    expect(JSON.stringify(body)).not.toContain("DO-NOT-EXPOSE"); expect(body.receipt).not.toHaveProperty("management_hash");
    expect(mocks.eq).toHaveBeenCalledWith("management_hash", expect.stringMatching(/^[a-f0-9]{64}$/));
  });
  it("rechaza referencias de pago, otros orígenes y acceso sin código", async () => {
    expect((await POST(request({ action: "status", code: "PAYMENT-REFERENCE" }))).status).toBe(400);
    expect((await POST(request(undefined, { origin: "https://example.org" }))).status).toBe(403);
    mocks.read.mockResolvedValueOnce({ data: null, error: null }); expect((await POST(request())).status).toBe(404);
    mocks.rateLimit.mockResolvedValueOnce(false); expect((await POST(request())).status).toBe(429);
  });
  it("las ediciones solo cambian privacidad y no confirman ni alteran pagos", async () => {
    expect((await POST(request({ action: "privacy", code, visibility: "private", showAmount: true, revision: 2, amount_cents: 999999, status: "confirmed" }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("update_support_privacy", { p_hash: expect.any(String), p_revision: 2, p_visibility: "private", p_name: null, p_show_amount: false });
    expect(mocks.revalidate.mock.calls.map(([path]) => path)).toEqual(["/", "/apoyar", "/admin/apoyos"]);
    mocks.update.mockResolvedValueOnce({ error: { code: "40001" } });
    expect((await POST(request({ action: "privacy", code, visibility: "anonymous", showAmount: false, revision: 1 }))).status).toBe(409);
  });
});

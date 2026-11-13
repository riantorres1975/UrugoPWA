import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ db: vi.fn(), from: vi.fn(), insert: vi.fn(), rateLimit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: () => "203.0.113.12", rateLimit: mocks.rateLimit }));
import { POST } from "@/app/api/support/contributions/route";
const claim = { method: "paypal", amount: "25", reference: "ABC123456", visibility: "anonymous", showAmount: false, paid: true };
const request = (body: unknown = claim, headers: Record<string, string> = {}) => new NextRequest("https://www.urugo.app/api/support/contributions", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
beforeEach(() => { vi.clearAllMocks(); mocks.rateLimit.mockResolvedValue(true); mocks.insert.mockResolvedValue({ error: null }); mocks.from.mockReturnValue({ insert: mocks.insert }); mocks.db.mockReturnValue({ from: mocks.from }); });
describe("registro privado de avisos", () => {
  it("ignora estado, fecha y datos ajenos enviados por el cliente: siempre queda pendiente", async () => {
    expect((await POST(request({ ...claim, status: "confirmed", confirmed_at: new Date().toISOString(), reviewed_by: "fake" }))).status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith({ method: "paypal", amount_cents: 2500, payment_reference: claim.reference, reference_hash: expect.stringMatching(/^[a-f0-9]{64}$/), visibility: "anonymous", display_name: null, show_amount: false });
    expect(mocks.from).toHaveBeenCalledWith("support_contributions");
  });
  it("rechaza otros orígenes, formatos, cargas grandes, avisos incompletos y abuso", async () => {
    expect((await POST(request(claim, { origin: "https://example.org" }))).status).toBe(403);
    expect((await POST(request(claim, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request({ ...claim, extra: "x".repeat(3100) }))).status).toBe(413);
    expect((await POST(request({ ...claim, paid: false }))).status).toBe(400);
    mocks.rateLimit.mockResolvedValueOnce(false);
    expect((await POST(request())).status).toBe(429);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("un duplicado no crea otro agradecimiento ni revela el aviso existente", async () => {
    mocks.insert.mockResolvedValueOnce({ error: { code: "23505" } });
    const response = await POST(request());
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ ok: true });
  });
  it("informa errores de guardado y no cuenta avisos atrapados por el campo señuelo", async () => {
    expect((await POST(request({ ...claim, website: "spam" }))).status).toBe(201);
    expect(mocks.insert).not.toHaveBeenCalled();
    mocks.db.mockReturnValueOnce(null); expect((await POST(request())).status).toBe(503);
    mocks.insert.mockResolvedValueOnce({ error: { code: "42P01" } }); expect((await POST(request())).status).toBe(502);
  });
});

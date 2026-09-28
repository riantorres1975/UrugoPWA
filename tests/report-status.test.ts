import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ db: vi.fn(), from: vi.fn(), select: vi.fn(), in: vi.fn(), rate: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.db }));
vi.mock("@/lib/rate-limit", () => ({ getClientIp: () => "203.0.113.2", rateLimit: mocks.rate }));
import { createReportReceipt, verifyReportReceipt } from "@/lib/report-receipt";
import { POST } from "@/app/api/community/reports/status/route";
import { POST as submit } from "@/app/api/community/reports/route";
const id = "46ed4c46-a5d7-4988-80d2-b9b5fdc96765";
const request = (data: unknown, headers = {}) => new NextRequest("https://urugo.app/api/community/reports/status", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("REPORTER_HASH_SECRET", "test-receipt-secret");
  mocks.db.mockReturnValue({ from: mocks.from }); mocks.from.mockReturnValue({ select: mocks.select, insert: mocks.insert }); mocks.select.mockReturnValue({ in: mocks.in });
  mocks.in.mockResolvedValue({ data: [{ id, status: "reviewing", updated_at: "2026-09-28" }], error: null });
  mocks.insert.mockResolvedValue({ error: null }); mocks.rate.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());
describe("seguimiento privado de reportes", () => {
  it("emite un recibo firmado solo después de insertar el reporte", async () => {
    const response = await submit(request({ reportType: "other", description: "El botón no responde en mi celular", website: "" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(verifyReportReceipt(body.receipt)).toBe(mocks.insert.mock.calls[0][0].id);
    mocks.insert.mockResolvedValue({ error: { message: "unavailable" } });
    const failed = await submit(request({ reportType: "other", description: "El botón no responde en mi celular" }));
    expect((await failed.json()).receipt).toBeUndefined();
  });
  it("solo consulta el estado de identificadores con firma válida", async () => {
    const response = await POST(request([createReportReceipt(id)]));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.select).toHaveBeenCalledWith("id,status,updated_at");
    expect(mocks.in).toHaveBeenCalledWith("id", [id]);
  });
  it("rechaza IDs solos, firmas modificadas, origen externo y exceso de recibos", async () => {
    expect((await POST(request([id]))).status).toBe(403);
    expect((await POST(request([`${id}.${"0".repeat(32)}`]))).status).toBe(403);
    expect((await POST(request([createReportReceipt(id)], { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request(Array(21).fill(createReportReceipt(id))))).status).toBe(400);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("tolera reportes eliminados y fallas sin revelar datos privados", async () => {
    mocks.in.mockResolvedValue({ data: [], error: null });
    expect(await (await POST(request([createReportReceipt(id)]))).json()).toEqual([]);
    mocks.in.mockResolvedValue({ data: null, error: { message: "private" } });
    expect((await POST(request([createReportReceipt(id)]))).status).toBe(503);
    mocks.rate.mockResolvedValue(false);
    expect((await POST(request([]))).status).toBe(429);
  });
});

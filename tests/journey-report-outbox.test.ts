import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOutboxSnapshot, parseOutbox, REPORT_OUTBOX_KEY, savePendingReport, sendPendingReports } from "@/lib/journey-report-outbox";

const report = { reportType: "route_changed", routeName: "Ruta 25", description: "Ahora pasa por la calle del mercado.", sourcePath: "/mapa", website: "" };
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());

describe("reportes pendientes", () => {
  it("persiste el reporte y evita guardar el mismo contenido dos veces", () => {
    savePendingReport(report);
    savePendingReport(report);
    expect(parseOutbox(getOutboxSnapshot())).toHaveLength(1);
    expect(parseOutbox(data.get(REPORT_OUTBOX_KEY)!)[0].report).toMatchObject(report);
  });
  it("no dice que guardó el reporte si el almacenamiento falla", () => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("quota"); } });
    expect(() => savePendingReport(report)).toThrow("No pudimos guardarlo");
  });
  it("tolera almacenamiento corrupto sin intentar enviarlo", () => {
    expect(parseOutbox("invalid")).toEqual([]);
    expect(parseOutbox(JSON.stringify([{ id: "a", savedAt: "now", report: {} }]))).toEqual([]);
  });
  it("elimina sólo lo confirmado y conserva los fallos para reintentar", async () => {
    savePendingReport(report);
    savePendingReport({ ...report, routeName: "Ruta 50" });
    const request = vi.fn().mockResolvedValueOnce(Response.json({ ok: true }, { status: 201 })).mockResolvedValueOnce(Response.json({ error: "Intenta después" }, { status: 503 }));
    vi.stubGlobal("fetch", request);
    await expect(sendPendingReports()).rejects.toThrow("Intenta después");
    expect(parseOutbox(getOutboxSnapshot()).map((item) => item.report.routeName)).toEqual(["Ruta 50"]);
    request.mockResolvedValue(Response.json({ ok: true }, { status: 201 }));
    expect(await sendPendingReports()).toBe(1);
    expect(parseOutbox(getOutboxSnapshot())).toEqual([]);
    expect(JSON.parse(request.mock.calls[2][1].body).routeName).toBe("Ruta 50");
  });
  it("no consume el reporte ni hace peticiones estando sin conexión", async () => {
    savePendingReport(report);
    vi.stubGlobal("navigator", { onLine: false });
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(sendPendingReports()).rejects.toThrow("Sin conexión");
    expect(request).not.toHaveBeenCalled();
    expect(parseOutbox(getOutboxSnapshot())).toHaveLength(1);
  });
});

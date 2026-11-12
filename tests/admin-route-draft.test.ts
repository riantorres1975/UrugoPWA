import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEditorDraft, readEditorDraft, removeEditorDraft, sameEditorRoute, saveEditorDraft, type EditorDraft } from "@/lib/admin-route-draft";

const draft: Omit<EditorDraft, "savedAt"> = { routeId: 26, baseVersion: 3, reportId: null,
  path: "[[-102.075,19.41],[-102.07,19.42]]", name: "Ruta 26", direction: "Ruta 26 (Ida)", color: "#abcdef", width: "500", operationalStatus: "active", summary: "Corrección del tramo",
  segment: { start: 0, end: 1, points: [[-102.072, 19.415]] } };
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe("borradores administrativos", () => {
  it("recupera el tramo sin terminar y mantiene separados ruta, sentido y reporte", () => {
    saveEditorDraft(draft);
    expect(readEditorDraft(26, null)).toMatchObject(draft);
    expect(readEditorDraft(27, null)).toBeNull();
    expect(readEditorDraft(26, "reporte")).toBeNull();
    saveEditorDraft({ ...draft, reportId: "reporte", summary: "Otro cambio" });
    expect(readEditorDraft(26, null)?.summary).toBe(draft.summary);
    removeEditorDraft(26, "reporte");
    expect(readEditorDraft(26, "reporte")).toBeNull();
    expect(readEditorDraft(26, null)).not.toBeNull();
  });
  it("retiene la versión de origen para impedir que se restaure sobre una nueva", () => {
    saveEditorDraft(draft);
    expect(readEditorDraft(26, null)?.baseVersion).toBe(3);
    expect(sameEditorRoute({ ...draft, path: JSON.stringify(JSON.parse(draft.path), null, 2) }, draft)).toBe(true);
    expect(sameEditorRoute({ ...draft, name: "Ruta diferente" }, draft)).toBe(false);
  });
  it("rechaza datos vencidos, mezclados o con conexiones fuera del recorrido", () => {
    const now = Date.parse("2026-11-12T12:00:00Z");
    for (const bad of [{ ...draft, savedAt: now - 8 * 86_400_000 }, { ...draft, savedAt: now + 120_000 },
      { ...draft, savedAt: now, routeId: 27 }, { ...draft, savedAt: now, segment: { start: 0, end: 99, points: [] } },
      { ...draft, savedAt: now, segment: { start: 0, end: 1, points: [[-80, 15]] } },
      { ...draft, savedAt: now, baseVersion: 0 },
    ]) expect(parseEditorDraft(JSON.stringify(bad), 26, null, now)).toBeNull();
  });
  it("permite conservar coordenadas incompletas y comunica errores de almacenamiento", () => {
    saveEditorDraft({ ...draft, path: "[todavía editando", segment: null });
    expect(readEditorDraft(26, null)?.path).toBe("[todavía editando");
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); } });
    expect(readEditorDraft(26, null)).toBeNull();
    expect(() => saveEditorDraft(draft)).toThrow("quota");
  });
});

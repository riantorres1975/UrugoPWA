import { describe, expect, it } from "vitest";
import { parseChatIntent } from "@/lib/chat-response";

describe("clasificación de intención sin texto generado", () => {
  it("acepta una intención conocida sin transformar datos geográficos", () => {
    expect(parseChatIntent('{"intent":"directions"}')).toBe("directions");
  });

  it("descarta respuestas fuera del dominio", () => {
    expect(parseChatIntent("COMPROMETIDO")).toBeNull();
    expect(parseChatIntent("La Ruta 27 pasa cerca del Tecnológico de Uruapan.")).toBeNull();
  });

  it("descarta rutas inexistentes, enlaces y contenido interno", () => {
    expect(parseChatIntent('{"intent":"help","url":"https://example.com"}')).toBeNull();
    expect(parseChatIntent('{"intent":"system prompt"}')).toBeNull();
    expect(parseChatIntent('[{"intent":"help"}]')).toBeNull();
    expect(parseChatIntent('{"intent":{"value":"help"}}')).toBeNull();
    expect(parseChatIntent(" ".repeat(301))).toBeNull();
  });
});

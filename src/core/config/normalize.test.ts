import { describe, expect, it } from "vitest";
import { normalizeLabel } from "./normalize";

describe("normalizeLabel", () => {
  it("pasa a minúsculas, quita acentos y colapsa espacios", () => {
    expect(normalizeLabel("  HABITACIÓN   ")).toBe("habitacion");
    expect(normalizeLabel("Ópalo")).toBe("opalo");
  });

  it("ignora la palabra salón en singular, con o sin acento", () => {
    expect(normalizeLabel("Salon Plaza Real A y B")).toBe("plaza real a y b");
    expect(normalizeLabel("SALÓN PLAZA CARACAS")).toBe("plaza caracas");
  });

  it("no borra otras palabras que contienen esas letras", () => {
    expect(normalizeLabel("Salones combinados")).toBe("salones combinados");
  });
});

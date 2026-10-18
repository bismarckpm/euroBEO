import { describe, expect, it } from "vitest";
import { parseProfileInput, signatureFromProfile } from "./profile";

describe("perfil de firma", () => {
  it("conserva el nombre y el cargo que firman los memorándums", () => {
    expect(signatureFromProfile({ name: "Ana Pérez", title: "Asistente de Ventas" })).toEqual({
      name: "Ana Pérez",
      title: "Asistente de Ventas",
    });
  });

  it("exige nombre y cargo", () => {
    expect(() => parseProfileInput({ name: "  ", title: "Asistente" })).toThrow(
      /nombre y el cargo/,
    );
    expect(parseProfileInput({ name: " Ana ", title: " Coordinadora " })).toEqual({
      name: "Ana",
      title: "Coordinadora",
    });
  });
});

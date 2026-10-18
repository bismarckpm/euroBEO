import { describe, expect, it } from "vitest";
import { seedFixedTexts, seedMemoType } from "./seed-data";

describe("textos copiados de las B.E.O. y los memos", () => {
  it("trae las instrucciones, la preparación y las iniciales del pie", () => {
    const byKey = new Map(seedFixedTexts.map((text) => [text.key, text.body]));
    expect(byKey.get("service_preparation")).toBe(
      "Por Favor estar preparado para el servicio 30 minutos o antes",
    );
    expect(byKey.get("special_instructions")).toContain("NO TIENEN CRÉDITO CON EL HOTEL");
    expect(byKey.get("special_instructions")).toContain("Agregar Impuestos Gubernamentales Vigentes");
    expect(byKey.get("footer_initials")).toBe("JG/AR");
  });

  it("arma el memo de tarifa con destinatario, palabra clave y variables", () => {
    expect(seedMemoType.name).toBe("Tarifa de estacionamiento");
    expect(seedMemoType.recipient).toBe("Sra. Milbia Pérez");
    expect(seedMemoType.company).toBe("Servicios Parking 2015 C.A.");
    expect(seedMemoType.keywords).toContain("tarifa plana de estacionamiento");
    expect(seedMemoType.body).toContain("{dias}");
    expect(seedMemoType.body).toContain("{evento}");
    expect(seedMemoType.body).toContain("{salones}");
    expect(seedMemoType.body).toContain("Valet Parking");
  });
});

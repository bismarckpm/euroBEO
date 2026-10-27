import { describe, expect, it } from "vitest";
import { normalizeLabel } from "../config/normalize";
import { seedSalons } from "../config/seed-data";
import {
  assignPlace,
  isEmptyMarker,
  placeKey,
  readBlockPlace,
  readPax,
  readSchedule,
  readSetup,
  statusForText,
} from "./field-status";

const salons = seedSalons.map((salon) => ({
  id: salon.name,
  name: salon.name,
  aliases: salon.aliases.map((label) => ({ normalized: normalizeLabel(label) })),
}));

describe("estado de un campo", () => {
  it("marca resuelto como Regla y el marcador vacío como Sin dato", () => {
    expect(statusForText("Topacio", true)).toBe("RULE");
    expect(isEmptyMarker("...")).toBe(true);
    expect(isEmptyMarker("-")).toBe(true);
    expect(isEmptyMarker("   ")).toBe(true);
    expect(statusForText("...", false)).toBe("ABSENT");
    expect(statusForText("-", false)).toBe("ABSENT");
    expect(statusForText(null, false)).toBe("ABSENT");
    expect(statusForText("según programa del cliente", false)).toBe("PENDING");
  });

  it("deja el horario legible en Regla y el texto libre en Pendiente", () => {
    expect(readSchedule("08:00 a 18:00")).toEqual({ value: "08:00 a 18:00", status: "RULE" });
    expect(readSchedule("06:00 pm a 11:00 pm")).toEqual({
      value: "06:00 pm a 11:00 pm",
      status: "RULE",
    });
    expect(readSchedule("según programa del cliente")).toEqual({
      value: "según programa del cliente",
      status: "PENDING",
    });
    expect(readSchedule("...")).toEqual({ value: null, status: "ABSENT" });
    expect(readSchedule(null)).toEqual({ value: null, status: "ABSENT" });
  });

  it("deja el montaje escrito en Regla y por definir en Pendiente", () => {
    expect(readSetup("Mesas redondas").status).toBe("RULE");
    expect(readSetup("por definir")).toEqual({ value: "por definir", status: "PENDING" });
    expect(readSetup("-")).toEqual({ value: null, status: "ABSENT" });
  });

  it("lee el pax numérico y trata el marcador vacío como Sin dato", () => {
    expect(readPax(["120 personas"])).toEqual({ value: 120, status: "RULE" });
    expect(readPax(["N° Pax: ..."])).toEqual({ value: null, status: "ABSENT" });
    expect(readPax(["... Personas"])).toEqual({ value: null, status: "ABSENT" });
    expect(readPax(["N° Pax: a confirmar"])).toEqual({ value: null, status: "PENDING" });
    expect(readPax(["Horario: 08:00 a 18:00"])).toEqual({ value: null, status: "ABSENT" });
  });
});

describe("lugar del bloque", () => {
  it("toma Stand Calox, Piscina y Salón Zafiro, y deja vacío el bloque sin lugar", () => {
    expect(readBlockPlace(["Stand Calox", "Hora: 09:00 a 18:00", "... Personas"])).toBe("Stand Calox");
    expect(readBlockPlace(["Piscina", "Montaje: Imperial"])).toBe("Piscina");
    expect(readBlockPlace(["Salón Zafiro", "Horario: 08:00 a 18:00"])).toBe("Zafiro");
    expect(readBlockPlace(["Horario: 08:00 a 18:00", "Montaje: Auditorio"])).toBeNull();
    expect(readBlockPlace(["Salón: Topacio", "N° Pax: 120"])).toBe("Topacio");
    expect(
      readBlockPlace([
        "Salón se retira el montaje de todas las áreas del hotel",
        "Horario: 08:00 a 18:00",
      ]),
    ).toBeNull();
  });

  it("unifica con el catálogo y conserva el texto que no coincide", () => {
    expect(assignPlace("Salon Plaza Real A y B", salons)).toEqual({ value: "Plaza Real", status: "RULE" });
    expect(assignPlace("Salón: Topacio", salons)).toEqual({ value: "Topacio", status: "RULE" });
    expect(assignPlace("Cancha de pádel", salons)).toEqual({ value: "Cancha de pádel", status: "RULE" });
    expect(assignPlace("Stand Calox", salons)).toEqual({ value: "Stand Calox", status: "RULE" });
    expect(assignPlace(null, salons)).toEqual({ value: null, status: "ABSENT" });
  });

  it("agrupa el mismo lugar aunque cambien mayúsculas o acentos", () => {
    expect(placeKey("Piscina")).toBe(placeKey("piscina"));
    expect(placeKey("Ópalo")).toBe(placeKey("opalo"));
    expect(placeKey("Stand Calox")).not.toBe(placeKey("Piscina"));
  });
});

import { describe, expect, it } from "vitest";
import { seedMemoType } from "../config/seed-data";
import { planMemoFields, selectMemoBeos, type MemoBeoSource } from "./content";

const issuedOn = new Date("2026-10-15T16:30:00.000Z");
const signer = { name: "Ana Pérez", title: "Asistente de Ventas" };
const type = { ...seedMemoType, excludeSetupDays: true };

function eventBeo(date: string, salon: string, kind = "EVENTO"): MemoBeoSource {
  return { date, salon, kind, billboard: "CONGRESO", billboardConfirmed: true };
}

describe("contenido del memorándum", () => {
  it("lista los cinco días en un solo texto y omite el montaje", () => {
    const beos = [
      eventBeo("2026-10-14", "Zafiro", "MONTAJE"),
      eventBeo("2026-10-15", "Plaza Venezuela"),
      eventBeo("2026-10-16", "Plaza Venezuela"),
      eventBeo("2026-10-17", "Plaza Venezuela"),
      eventBeo("2026-10-18", "Zafiro"),
      eventBeo("2026-10-19", "Zafiro"),
    ];
    const fields = planMemoFields({ type, beos, signer, number: "", issuedOn, eventTitle: "Evento" });
    const body = fields.find((field) => field.key === "cuerpo");
    expect(body?.value).toContain("15, 16, 17, 18 y 19 de octubre de 2026");
    expect(body?.value).toContain("Plaza Venezuela y Zafiro");
    expect(body?.value).not.toContain("14");
    expect(body?.status).toBe("RULE");
  });

  it("repite el salón confirmado de la B.E.O.", () => {
    const fields = planMemoFields({
      type,
      beos: [eventBeo("2026-10-07", "Plaza Venezuela")],
      signer,
      number: "75",
      issuedOn,
      eventTitle: "Evento",
    });
    expect(fields.find((field) => field.key === "cuerpo")?.value).toContain("Plaza Venezuela");
    expect(fields.find((field) => field.key === "de")?.value).toBe("Ana Pérez");
    expect(fields.find((field) => field.key === "cargo")?.value).toBe("Asistente de Ventas");
    expect(fields.find((field) => field.key === "para")?.value).toBe(seedMemoType.recipient);
    expect(fields.find((field) => field.key === "empresa")?.value).toBe(seedMemoType.company);
    expect(fields.find((field) => field.key === "referencia")?.value).toBe(seedMemoType.reference);
    expect(fields.find((field) => field.key === "numero")?.status).toBe("RULE");
  });

  it("deja el número propuesto en Regla", () => {
    const fields = planMemoFields({
      type,
      beos: [eventBeo("2026-10-07", "Plaza Venezuela")],
      signer,
      number: "90",
      issuedOn,
      eventTitle: "Evento",
    });
    expect(fields.find((field) => field.key === "numero")).toMatchObject({ value: "90", status: "RULE" });
  });

  it("marca el cuerpo para revisar cuando la cartelera no está confirmada", () => {
    const fields = planMemoFields({
      type,
      beos: [{ ...eventBeo("2026-10-07", "Plaza Venezuela"), billboardConfirmed: false }],
      signer,
      number: "75",
      issuedOn,
      eventTitle: "Evento",
    });
    expect(fields.find((field) => field.key === "cuerpo")?.status).toBe("REVIEW");
  });

  it("usa el único día de montaje cuando el evento no tiene B.E.O. de evento", () => {
    const onlySetup = [eventBeo("2026-10-23", "Topacio", "MONTAJE")];
    expect(selectMemoBeos(onlySetup, true)).toHaveLength(1);
    const fields = planMemoFields({
      type,
      beos: onlySetup,
      signer,
      number: "90",
      issuedOn,
      eventTitle: "Almuerzo",
    });
    expect(fields.find((field) => field.key === "cuerpo")?.value).toContain("23 de octubre de 2026");
    expect(fields.find((field) => field.key === "cuerpo")?.value).toContain("Topacio");
  });
});

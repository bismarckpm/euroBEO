import { describe, expect, it } from "vitest";
import { generateButtonState, validateBeoLines, validatePrintable } from "./validate-beo";
import type { BeoTemplateData } from "./beo-template-data";

const empty: BeoTemplateData = {
  numero: "0.001/26",
  preparadoEl: "19/10/2026",
  evento: "Cliente",
  direccion: "—",
  telefono: "",
  contacto: "Ana",
  compania: "Cliente",
  dia: "Viernes",
  fecha: "23/10/26",
  horario: "",
  eventoTipo: "Cena",
  salon: "Zafiro",
  garantia: "10",
  renta: "—",
  cartelera: "Cena",
  tituloDerecha: "",
  foodItems: [],
  rightSections: [{ title: "PENDIENTE", lines: ["Por definir"] }],
  staff: {
    setupLabel: "Montaje:",
    setup: [],
    serviceLabel: "Servicio Evento:",
    service: [],
    teardownLabel: "Desmontaje:",
    teardown: [],
  },
  preparacion: "",
  instrucciones: "",
  montaje: "",
  iniciales: "JG/AR",
};

describe("validación previa al render", () => {
  it("señala el ítem y la B.E.O. cuando falta la sección", () => {
    const issues = validateBeoLines("Zafiro 2026-10-23", [
      {
        section: "",
        groupName: "",
        description: "Tablas de embutidos por persona",
        unitPriceCents: 2516,
        text: "Tablas",
      },
    ]);
    expect(issues.some((issue) => issue.field.includes("Tablas") && issue.beo.includes("Zafiro"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("Alimentos y Bebidas"))).toBe(true);
  });

  it("deshabilita confirmar y generar cuando hay errores y nombra el ítem y la B.E.O.", () => {
    const issues = validateBeoLines("Zafiro 23/10/2026", [
      {
        section: "",
        groupName: "",
        description: "Cena de gala",
        unitPriceCents: 4000,
        text: "Cena",
      },
    ]);
    const button = generateButtonState({ pendingCount: 0, issues });
    expect(button.disabled).toBe(true);
    expect(button.messages.join(" ")).toContain("Falta clasificar");
    expect(button.messages.join(" ")).toContain("Cena de gala");
    expect(button.messages.join(" ")).toContain("Zafiro 23/10/2026");
    expect(generateButtonState({ pendingCount: 0, issues: [] }).disabled).toBe(false);
  });

  it("no toma un agua por persona ya puesta en Bebidas como comida sin sección", () => {
    const issues = validateBeoLines("Plaza Real 2026-10-21", [
      {
        section: "BEBIDAS",
        groupName: "",
        description: "Agua mineral 500 ml p/p",
        unitPriceCents: 200,
        text: "Agua",
      },
    ]);
    expect(issues.some((issue) => issue.message.includes("Alimentos y Bebidas"))).toBe(false);
  });

  it("genera un alimento sin precio", () => {
    const issues = validateBeoLines("Topacio 22/10/2026", [
      {
        section: "ALIMENTOS",
        groupName: "",
        description: "Cena de gala",
        unitPriceCents: null,
        text: "Cena",
      },
    ]);
    expect(issues.some((issue) => issue.message.includes("precio"))).toBe(false);
    expect(generateButtonState({ pendingCount: 0, issues }).disabled).toBe(false);
  });

  it("no alerta si el evento no trae alimentos ni personal", () => {
    expect(validateBeoLines("Piscina 07/10/2026", [])).toEqual([]);
  });

  it("exige subgrupo en el personal", () => {
    const issues = validateBeoLines("Zafiro 23/10/2026", [
      {
        section: "PERSONAL",
        groupName: "",
        description: "Supervisor",
        unitPriceCents: 5400,
        text: "01 Supervisor",
      },
    ]);
    expect(issues.some((issue) => issue.message.includes("no tiene subgrupo") && issue.field.includes("Supervisor"))).toBe(
      true,
    );
  });

  it("no deja imprimir Pendiente", () => {
    const issues = validatePrintable("Zafiro 2026-10-23", empty);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]?.message).toContain("Pendiente");
  });
});

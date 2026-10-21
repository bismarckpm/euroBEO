import { describe, expect, it } from "vitest";
import { tracked, type BudgetItem, type BudgetSection } from "../budget/model";
import { classifyItem, eventColumn, personnelGroup } from "./classify";
import { structureFood } from "./food";
import { defaultEventTypes } from "./presentation";

function item(description: string, section: string | null = null): BudgetItem {
  return {
    qty: 1,
    description,
    nights: 1,
    unitPrice: 100,
    total: 100,
    flags: [],
    section: tracked(section, section ? "RULE" : "PENDING"),
  };
}

function header(headerRaw: string, target: string | null): BudgetSection {
  return { headerRaw, target: tracked(target, target ? "RULE" : "PENDING"), items: [] };
}

describe("clasificación de la cata", () => {
  it("manda la comida mal titulada a alimentos y deja bebidas y descorche aparte", () => {
    const section = header("CENA CONFERENCIA", null);
    expect(
      classifyItem({
        description: item("Tablas de embutidos por persona").description,
        headerSection: section.target.value,
        catalogSection: null,
      }).section,
    ).toBe("ALIMENTOS");
    expect(
      classifyItem({
        description: "Cata\nQueso Manchego",
        headerSection: null,
        catalogSection: null,
      }).section,
    ).toBe("ALIMENTOS");
    expect(
      classifyItem({
        description: "Pasapalos 1p/p",
        headerSection: null,
        catalogSection: null,
      }).section,
    ).toBe("ALIMENTOS");
    expect(
      classifyItem({
        description: "Agua Mineral",
        headerSection: null,
        catalogSection: "BEBIDAS",
      }).section,
    ).toBe("BEBIDAS");
    expect(
      classifyItem({
        description: "Descorche de Vino o Espumante",
        headerSection: null,
        catalogSection: null,
      }).section,
    ).toBe("DESCORCHE");
  });

  it("separa el personal de montaje y el de evento aunque el bloque se llame MONTAJE", () => {
    expect(personnelGroup("PERSONAL MONTAJE", "MONTAJE")).toBe("Montaje");
    expect(personnelGroup("PERSONAL", "MONTAJE")).toBe("Evento");
    expect(personnelGroup("PERSONAL DESMONTAJE", "EVENTO")).toBe("Desmontaje");
  });

  it("imprime N° pax solo cuando la cantidad es el pax del bloque", () => {
    const cata = structureFood({
      description: "Cata\nQueso Manchego (1 porción individual cata)",
      qty: 150,
      unitPriceCents: 300,
      blockPax: 150,
      setup: "mesas redondas para 8 personas",
      tableCalculation: true,
    });
    expect(cata.title).toBe("Cata");
    expect(cata.paxLabel).toBe("150");
    expect(cata.unitPrice).toBe("3,00");

    const tables = structureFood({
      description: "Tablas de embutidos por persona\nSe calculan 3 por mesa.",
      qty: 58,
      unitPriceCents: 2516,
      blockPax: 150,
      setup: "mesas redondas para 8 personas",
      tableCalculation: false,
    });
    expect(tables.paxLabel).toBeUndefined();
    expect(tables.note).toBe("Se calculan 3 por mesa");
    expect(tables.needsReview).toBe(true);
  });

  it("completa las mesas cuando el cálculo está activo", () => {
    const tables = structureFood({
      description: "Tablas de embutidos por persona\nSe calculan 3 por mesa.",
      qty: 58,
      unitPriceCents: 2516,
      blockPax: 150,
      setup: "mesas redondas para 8 personas",
      tableCalculation: true,
    });
    expect(tables.note).toBe("Se calculan 3 tablas por mesa - 19 mesas");
  });

  it("el respaldo de alimentos gana a una IA que contradice CENA CONFERENCIA", () => {
    const section = header("CENA CONFERENCIA", null);
    const classified = classifyItem({
      description: "Tablas de embutidos por persona",
      headerSection: section.target.value,
      catalogSection: null,
      aiSection: "SISTEMAS",
    });
    expect(classified.section).toBe("ALIMENTOS");
    expect(
      classifyItem({
        description: "Proyector",
        headerSection: null,
        catalogSection: null,
        aiSection: "SISTEMAS",
      }).section,
    ).toBe("SISTEMAS");
  });

  it("aplica el tipo LANZAMIENTO agregado al catálogo", () => {
    expect(
      eventColumn({
        title: "Lanzamiento de producto",
        kind: "EVENTO",
        hasFood: true,
        hasServiceStaff: false,
        types: [...defaultEventTypes, { label: "LANZAMIENTO", keywords: ["lanzamiento"] }],
      }),
    ).toBe("LANZAMIENTO");
  });

  it("deduce CATA aunque el bloque sea de montaje", () => {
    expect(
      eventColumn({
        title: "CATA DE VINO",
        kind: "MONTAJE",
        hasFood: true,
        hasServiceStaff: true,
        types: defaultEventTypes,
      }),
    ).toBe("CATA");
    expect(
      eventColumn({
        title: "CATA DE VINO",
        kind: "MONTAJE",
        hasFood: false,
        hasServiceStaff: false,
        types: defaultEventTypes,
      }),
    ).toBe("Montaje");
  });
});

import { describe, expect, it } from "vitest";
import { classifyCatalogItem, resolveSalonText, resolveSectionHeader } from "./resolve";
import { normalizeLabel } from "./normalize";
import { seedCatalogItems, seedSalons, seedSectionMappings } from "./seed-data";
import type { BeoSection } from "./sections";

const salons = seedSalons.map((salon, index) => ({
  id: `salon-${index}`,
  name: salon.name,
  aliases: salon.aliases.map((label) => ({ normalized: normalizeLabel(label) })),
}));

const mappings = seedSectionMappings.map((mapping) => ({
  normalized: normalizeLabel(mapping.header),
  section: mapping.section,
}));

const items = seedCatalogItems.map((item) => ({
  normalized: normalizeLabel(item.description),
  section: item.section,
}));

function sectionOf(header: string): BeoSection {
  const resolved = resolveSectionHeader(header, mappings);
  expect(resolved.status).toBe("resolved");
  if (resolved.status !== "resolved") {
    throw new Error(header);
  }
  return resolved.section;
}

describe("resolveSalonText", () => {
  it("resuelve el alias Plaza Real A y B al nombre oficial", () => {
    const resolved = resolveSalonText("Salon Plaza Real A y B", salons);
    expect(resolved).toMatchObject({ status: "resolved", name: "Plaza Real" });
  });

  it("resuelve SALON PLAZA CARACAS al salón Diamante", () => {
    const resolved = resolveSalonText("SALON PLAZA CARACAS", salons);
    expect(resolved).toMatchObject({ status: "resolved", name: "Diamante" });
  });

  it("resuelve el nombre oficial aunque el texto traiga la palabra salón", () => {
    expect(resolveSalonText("Salon Plaza Venezuela", salons)).toMatchObject({
      status: "resolved",
      name: "Plaza Venezuela",
    });
    expect(resolveSalonText("Turmalina - Opalo", salons)).toMatchObject({
      status: "resolved",
      name: "Turmalina - Ópalo",
    });
  });

  it("marca como no resuelto un salón que no está en el catálogo", () => {
    expect(resolveSalonText("Salon Inexistente", salons)).toEqual({ status: "unresolved" });
  });
});

describe("resolveSectionHeader", () => {
  it("asigna las variantes de personal a PERSONAL", () => {
    expect(sectionOf("PERSONAL")).toBe("PERSONAL");
    expect(sectionOf("PERSONAL MONTAJE")).toBe("PERSONAL");
    expect(sectionOf("PERSONAL PARA EL SERVICIO DE COMIDAS")).toBe("PERSONAL");
    expect(sectionOf("PERSONAL PARA EL SERVICIO")).toBe("PERSONAL");
    expect(sectionOf("PERSONAL EVENTO")).toBe("PERSONAL");
    expect(sectionOf("Personal")).toBe("PERSONAL");
  });

  it("mapea los encabezados reales del presupuesto", () => {
    expect(sectionOf("ALIMENTOS Y BEBIDAS")).toBe("ALIMENTOS");
    expect(sectionOf("SISTEMAS")).toBe("SISTEMAS");
    expect(sectionOf("DESCORCHE")).toBe("DESCORCHE");
    expect(sectionOf("ACCESO")).toBe("ACCESOS");
    expect(sectionOf("MOBILIARIO")).toBe("MOBILIARIO");
    expect(sectionOf("ELECTRICIDAD")).toBe("ELECTRICIDAD");
  });

  it("excluye habitación", () => {
    expect(sectionOf("HABITACIÓN")).toBe("EXCLUIR");
  });
});

describe("classifyCatalogItem", () => {
  it("clasifica Filtros de agua en Bebidas aunque el encabezado sea alimentos", () => {
    const section = sectionOf("ALIMENTOS Y BEBIDAS");
    expect(classifyCatalogItem("Filtros de agua", section, items)).toBe("BEBIDAS");
  });

  it("deja el ítem en la sección del encabezado si no está en el catálogo", () => {
    expect(classifyCatalogItem("Menú ejecutivo", "ALIMENTOS", items)).toBe("ALIMENTOS");
  });

  it("no reclasifica ítems de una sección excluida", () => {
    expect(classifyCatalogItem("Filtros de agua", "EXCLUIR", items)).toBe("EXCLUIR");
  });
});

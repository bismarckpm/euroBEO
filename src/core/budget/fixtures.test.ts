import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedSalons, seedSectionMappings } from "../config/seed-data";
import { parseBudget, type BudgetCatalog } from "./parse-budget";
import { extractPdfFragments } from "../../lib/pdf-text";
import type { ParsedBudget } from "./model";

const dir = path.join(process.cwd(), "fixtures", "presupuestos");
const expectedDir = path.join(process.cwd(), "fixtures", "expected");
const available = existsSync(dir);

function catalog(): BudgetCatalog {
  return {
    salons: seedSalons.map((salon) => ({
      id: salon.name,
      name: salon.name,
      aliases: salon.aliases.map((label) => ({ normalized: normalizeLabel(label) })),
    })),
    mappings: seedSectionMappings.map((mapping) => ({
      normalized: normalizeLabel(mapping.header),
      section: mapping.section,
    })),
    items: seedCatalogItems.map((item) => ({
      normalized: normalizeLabel(item.description),
      section: item.section,
    })),
    keywords: ["tarifa plana de estacionamiento"],
  };
}

function pdfNames(): string[] {
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".pdf") && !name.endsWith("_1.pdf"))
    .sort();
}

function slug(name: string): string {
  return name
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function read(name: string): Promise<ParsedBudget> {
  const data = new Uint8Array(readFileSync(path.join(dir, name)));
  return parseBudget(await extractPdfFragments(data), { catalog: catalog() });
}

function project(budget: ParsedBudget) {
  return {
    company: budget.client.company,
    contact: budget.client.contact,
    rif: budget.client.rif,
    title: budget.eventTitle,
    locator: budget.header.locator,
    subtotal: budget.totals.subtotal,
    triggers: budget.triggers,
    structureErrors: budget.structureErrors.map((error) => error.message),
    reconciliationOk: budget.reconciliation.ok,
    difference: budget.reconciliation.difference,
    days: budget.days.map((day) => ({
      dates: day.dates,
      blocks: day.blocks.map((block) => ({
        kind: block.kind,
        rawTitle: block.rawTitle,
        salon: block.salonRaw,
        salonResolved: block.salon.value,
        salonStatus: block.salon.status,
        schedule: block.schedule.value,
        setup: block.setup.value,
        pax: block.pax.value,
        paxStatus: block.pax.status,
        nights: block.nights,
        rent: block.rent,
        sections: block.sections.map((section) => ({
          header: section.headerRaw,
          target: section.target.value,
          items: section.items.map((item) => ({
            qty: item.qty,
            description: item.description,
            nights: item.nights,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        })),
      })),
    })),
  };
}

describe.skipIf(!available)("presupuestos de ejemplo", () => {
  it("cuadra todos y coincide con el JSON esperado", async () => {
    mkdirSync(expectedDir, { recursive: true });
    const names = pdfNames();
    expect(names.length).toBeGreaterThanOrEqual(9);

    for (const name of names) {
      const budget = await read(name);
      expect(budget.reconciliation.ok, name).toBe(true);
      const file = path.join(expectedDir, `${slug(name)}.json`);
      const projected = project(budget);
      if (!existsSync(file)) {
        writeFileSync(file, `${JSON.stringify(projected, null, 2)}\n`, "utf8");
      }
      expect(projected, name).toEqual(JSON.parse(readFileSync(file, "utf8")));
    }
  });

  it("lee el almuerzo FARMA con la descripción completa y el subtotal 4.231,00", async () => {
    const budget = await read(
      "Presupuesto Congreso de Reumatología 22 al 24.10.2026 - Almuerzo FARMA 2.pdf",
    );
    expect(budget.client.company).toBe("FARMA");
    expect(budget.client.contact).toBeNull();
    expect(budget.client.rif).toBeNull();
    expect(budget.totals.subtotal).toBe(423100);
    const lunch = budget.days
      .flatMap((day) => day.blocks)
      .flatMap((block) => block.sections)
      .flatMap((section) => section.items)
      .find((item) => item.qty === 150);
    expect(lunch?.description).toContain("Entrada:");
    expect(lunch?.description).toContain("Principal:");
    expect(lunch?.description).toContain("Postre:");
    expect(lunch?.unitPrice).toBe(2500);
    expect(lunch?.total).toBe(375000);
    const supervisor = budget.days
      .flatMap((day) => day.blocks)
      .flatMap((block) => block.sections)
      .flatMap((section) => section.items)
      .find((item) => item.description.startsWith("Supervisor"));
    expect(supervisor?.unitPrice).toBe(5850);
    expect(supervisor?.total).toBe(5850);
    expect(budget.triggers).toContain("tarifa plana de estacionamiento");
  });

  it("asocia el evento de reumatología a las dos fechas y resuelve Topacio", async () => {
    const budget = await read(
      "Presupuesto Congreso de Reumatología 22 al 24.10.2026 - Evento 3.pdf",
    );
    const blocks = budget.days.flatMap((day) => day.blocks.map((block) => ({ day, block })));
    const event = blocks.find(
      (entry) => entry.block.salon.value === "Topacio" && entry.block.kind === "EVENTO",
    );
    expect(event?.day.dates).toEqual(["2026-10-23", "2026-10-24"]);
    expect(event?.block.rent.regular).toBe(450000);
    expect(event?.block.rent.net).toBe(585000);
    expect(event?.block.rent.discountLabel).toMatch(/35%/);
    expect(event?.block.salon.status).toBe("RULE");
    const missingPax = blocks.find(
      (entry) => entry.block.salon.value === "Topacio" && entry.block.pax.status === "ABSENT",
    );
    expect(missingPax?.block.pax.value).toBeNull();
    const courtesy = blocks.find((entry) => entry.block.rent.courtesy);
    expect(courtesy?.block.rent.net).toBeNull();
  });

  it("lee la cabecera de Nena y la renta de Federación China", async () => {
    const nena = await read(
      "Presupuesto Gran Encuentro Nena 2026 - 20 al 23.10.2026 - EVENTO 3.pdf",
    );
    expect(nena.client.company).toBe("Droguería Nena");
    expect(nena.client.contact).toBe("Luis Mendoza");
    expect(nena.eventTitle).toBe("GRAN ENCUENTRO NENA 2026");
    expect(nena.triggers).toContain("tarifa plana de estacionamiento");

    const china = await read("Presupuesto Federación China - 07.10.2026 - Evento Interno.pdf");
    expect(china.client.company).toBe("FEDERACIÓN CHINA");
    expect(china.eventTitle).toBe("CENA DE GALA");
    expect(china.structureErrors).toEqual([]);
    expect(china.reconciliation.difference).toBe(0);
    const block = china.days[0]?.blocks[0];
    expect(block?.salon.value).toBe("Plaza Real");
    expect(block?.salon.status).toBe("RULE");
    expect(block?.pax).toEqual({ value: 700, status: "RULE" });
    expect(block?.rent).toMatchObject({ regular: 950000, net: 741500, courtesy: false });
    expect(block?.setup.value).toMatch(/Mesas redondas/);
    expect(china.triggers).toContain("tarifa plana de estacionamiento");
  });

  it("avisa cuando el PDF no trae encabezado de tabla", async () => {
    const budget = await read(
      "Presupuesto Reunión SERVICIOS ALTA COCINA ,C.A 01.10.2026 - Evento 4.pdf",
    );
    expect(
      budget.structureErrors.some((error) => error.page === 1 && /tabla/i.test(error.message)),
    ).toBe(true);
    expect(budget.reconciliation.ok).toBe(true);
  });
});

describe("estructura", () => {
  it("indica la página cuando no hay tabla reconocible", () => {
    const budget = parseBudget([{ text: "Nota suelta", x: 40, y: 700, width: 40, page: 2 }]);
    expect(
      budget.structureErrors.some((error) => error.page === 1 && /tabla/i.test(error.message)),
    ).toBe(true);
    expect(budget.structureErrors.some((error) => error.section === "cabecera")).toBe(false);
    expect(budget.structureErrors.some((error) => error.section === "totales")).toBe(false);
  });

  it("procesa un presupuesto con tabla y sin sección de totales", () => {
    const row = (text: string, x: number, y: number, width = 70) => ({ text, x, y, width, page: 1 });
    const budget = parseBudget([
      row("Cantidad", 40, 720, 50),
      row("Descripción", 160, 720, 80),
      row("Día", 330, 720, 30),
      row("Moneda", 390, 720, 40),
      row("Tarifa", 450, 720, 40),
      row("Total", 540, 720, 40),
      row("07 de octubre de 2026", 40, 680, 160),
      row("1", 48, 640, 12),
      row("Stand Calox", 160, 640, 80),
      row("Renta", 456, 640, 40),
      row("100,00", 546, 640, 36),
    ]);
    expect(budget.structureErrors).toEqual([]);
    expect(budget.totals.subtotal).toBeNull();
    expect(budget.days[0]?.blocks[0]?.salon).toEqual({ value: "Stand Calox", status: "RULE" });
    expect(budget.days[0]?.blocks[0]?.pax).toEqual({ value: null, status: "ABSENT" });
    expect(budget.warnings.some((warning) => /totales/i.test(warning))).toBe(false);
  });

  it("avisa un ítem sin total y noches distintas sin bloquear", () => {
    const row = (text: string, x: number, y: number, width = 70) => ({ text, x, y, width, page: 1 });
    const budget = parseBudget([
      row("Cantidad", 40, 720, 50),
      row("Descripción", 160, 720, 80),
      row("Día", 330, 720, 30),
      row("Moneda", 390, 720, 40),
      row("Tarifa", 450, 720, 40),
      row("Total", 540, 720, 40),
      row("07 de octubre de 2026", 40, 680, 160),
      row("1", 48, 640, 12),
      row("2", 330, 640, 12),
      row("Stand Calox", 160, 640, 80),
      row("Renta", 456, 640, 40),
      row("100,00", 546, 640, 36),
      row("1", 48, 600, 12),
      row("Agua", 160, 600, 40),
    ]);
    expect(budget.structureErrors).toEqual([]);
    expect(budget.warnings.some((warning) => warning.startsWith("Ítem sin total: Agua"))).toBe(true);
    expect(budget.warnings.some((warning) => /2 noches/.test(warning))).toBe(true);
    expect(budget.reconciliation.ok).toBe(true);
  });
});

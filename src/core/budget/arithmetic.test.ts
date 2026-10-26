import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateButtonState } from "../documents/validate-beo";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedSalons, seedSectionMappings } from "../config/seed-data";
import { acknowledgeAmountAlert, correctAmountAlert, verifyArithmetic } from "./arithmetic";
import type { ArithmeticIssue, ParsedBudget } from "./model";
import { parseBudget, type BudgetCatalog } from "./parse-budget";
import { tracked } from "./model";
import { extractPdfFragments } from "../../lib/pdf-text";

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

async function readGolden(caseId: string): Promise<ParsedBudget> {
  const data = new Uint8Array(
    readFileSync(path.join(process.cwd(), "fixtures", "golden", caseId, "presupuesto.pdf")),
  );
  return parseBudget(await extractPdfFragments(data), { catalog: catalog() });
}

function sampleBudget(input: {
  unitPrice: number;
  total: number;
  subtotal: number;
  iva: number;
  logistics: number;
  general: number;
}): ParsedBudget {
  return {
    header: {
      locator: null,
      issuedOn: null,
      checkIn: null,
      checkOut: null,
      executive: null,
      role: null,
      email: null,
      phone: null,
    },
    client: {
      company: null,
      contact: null,
      phones: null,
      address: null,
      email: null,
      rif: null,
    },
    eventTitle: null,
    days: [
      {
        dates: ["2026-10-22"],
        raw: "",
        blocks: [
          {
            kind: "MONTAJE",
            rawTitle: "Día previo de montaje",
            salonRaw: null,
            salon: tracked(null, "PENDING"),
            schedule: tracked(null, "PENDING"),
            setup: tracked(null, "PENDING"),
            pax: tracked(null, "PENDING"),
            nights: 1,
            rent: { regular: null, net: null, discountLabel: null, courtesy: false },
            sections: [
              {
                headerRaw: "PERSONAL PARA EL MONTAJE - DESMONTAJE",
                target: tracked("PERSONAL", "RULE"),
                items: [
                  {
                    qty: 1,
                    description: "Supervisor",
                    nights: 1,
                    unitPrice: input.unitPrice,
                    total: input.total,
                    flags: [],
                    section: tracked("PERSONAL", "RULE"),
                  },
                ],
              },
            ],
            page: 1,
          },
        ],
      },
    ],
    totals: {
      subtotal: input.subtotal,
      iva: input.iva,
      logistics: input.logistics,
      general: input.general,
      igtf: null,
      payable: null,
    },
    benefits: [],
    triggers: [],
    warnings: [],
    structureErrors: [],
    reconciliation: { expected: input.subtotal, actual: input.total, difference: 0, lines: [], ok: true },
  };
}

describe("alertas de montos", () => {
  it("alerta una fila que no cuadra y deja generar", () => {
    const issues = verifyArithmetic(
      sampleBudget({ unitPrice: 5350, total: 5850, subtotal: 5850, iva: 936, logistics: 0, general: 6786 }),
    );
    const row = issues.find((issue) => issue.equation === "row");
    expect(row).toMatchObject({
      cell: "Supervisor",
      printed: 5850,
      calculated: 5350,
      difference: 500,
      reviewed: false,
    });
    expect(row?.message).toBe("Supervisor: impreso 58,50, calculado 53,50, diferencia 5,00.");
    expect(generateButtonState({ pendingCount: 0, issues: [] }).disabled).toBe(false);
  });

  it("alerta un IVA mal calculado y deja generar", () => {
    const issues = verifyArithmetic(
      sampleBudget({ unitPrice: 10000, total: 10000, subtotal: 10000, iva: 1000, logistics: 0, general: 11000 }),
    );
    const iva = issues.find((issue) => issue.equation === "iva");
    expect(issues.map((issue) => issue.equation)).toEqual(["iva"]);
    expect(iva).toMatchObject({ printed: 1000, calculated: 1600, difference: -600 });
    expect(generateButtonState({ pendingCount: 0, issues: [] }).disabled).toBe(false);
  });

  it("corregir al valor calculado quita la alerta y marcarla la deja revisada", () => {
    const issues: ArithmeticIssue[] = [
      {
        equation: "iva",
        cell: "IVA",
        printed: 1000,
        calculated: 1600,
        difference: -600,
        message: "IVA: impreso 10,00, calculado 16,00, diferencia -6,00.",
        reviewed: false,
      },
    ];
    expect(acknowledgeAmountAlert(issues, "iva", "IVA")[0]?.reviewed).toBe(true);
    expect(correctAmountAlert(issues, "iva", "IVA", 1600)).toEqual([]);
    expect(issues[0]?.printed).toBe(1000);
  });

  it("la cata y Reumatología cuadran con la regla", async () => {
    const cata = await readGolden("cata-eleaexeltis");
    const reuma = await readGolden("reumatologia");
    expect(cata.totals.iva).toBe(59116);
    expect(reuma.totals.iva).toBe(286957);
    expect(cata.arithmetic?.map((issue) => issue.equation) ?? []).toEqual([]);
    expect(reuma.arithmetic?.map((issue) => issue.equation) ?? []).toEqual([]);
  });

  it("Nena no alerta la logística impresa", async () => {
    const nena = await readGolden("nena");
    const equations = nena.arithmetic?.map((issue) => issue.equation) ?? [];
    expect(nena.arithmetic?.some((issue) => issue.cell === "Logística") ?? false).toBe(false);
    expect(nena.totals.logistics).toBe(58779);
    expect(equations.filter((equation) => equation === "total")).toEqual([]);
  });
});

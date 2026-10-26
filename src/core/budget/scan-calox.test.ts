import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedSalons, seedSectionMappings } from "../config/seed-data";
import type { BudgetCatalog } from "./parse-budget";
import type { ParsedBudget } from "./model";
import { readBudgetPdf } from "../../lib/budget-ingest";

const caseDir = path.join(process.cwd(), "fixtures", "golden", "scan-calox");

type ExpectedItem = {
  qty: number;
  description: string;
  days: number;
  unitPrice: string;
  total: string;
};

type ExpectedCells = {
  days: {
    date: string;
    blocks: {
      title: string;
      expectedKind: string;
      sections: { header: string; items: ExpectedItem[] }[];
    }[];
  }[];
  totals: {
    subtotal: string;
    iva16: string;
    logistica1: string;
    totalEvento: string;
  };
};

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

function cents(amount: string): number {
  return Math.round(Number(amount.replaceAll(".", "").replace(",", ".")) * 100);
}

/** Compara el presupuesto leído con las celdas verificadas del escaneo. */
export function assertCaloxCells(budget: ParsedBudget, expected: ExpectedCells): void {
  const day = budget.days[0];
  const block = day?.blocks[0];
  const expectedDay = expected.days[0];
  const expectedBlock = expectedDay?.blocks[0];
  expect(day?.dates).toEqual([expectedDay?.date]);
  expect(block?.rawTitle).toBe(expectedBlock?.title);
  expect(block?.kind).toBe(expectedBlock?.expectedKind);
  const items = block?.sections.flatMap((section) => section.items) ?? [];
  const expectedItems = expectedBlock?.sections.flatMap((section) => section.items) ?? [];
  expect(items.map((item) => item.description.split("\n")[0])).toEqual(
    expectedItems.map((item) => item.description),
  );
  expect(
    items.map((item) => ({
      qty: item.qty,
      days: item.nights,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
  ).toEqual(
    expectedItems.map((item) => ({
      qty: item.qty,
      days: item.days,
      unitPrice: cents(item.unitPrice),
      total: cents(item.total),
    })),
  );
  expect(budget.totals.subtotal).toBe(cents(expected.totals.subtotal));
  expect(budget.totals.iva).toBe(cents(expected.totals.iva16));
  expect(budget.totals.logistics).toBe(cents(expected.totals.logistica1));
  expect(budget.totals.general).toBe(cents(expected.totals.totalEvento));
  expect(block?.sections.map((section) => section.target.value)).toEqual(["ALIMENTOS", "PERSONAL"]);
  expect(budget.arithmetic?.some((issue) => issue.cell === "Logística") ?? false).toBe(false);
}

describe("escaneo de Calox", () => {
  it("lee el PDF sin texto y coincide con expected-cells.json", async () => {
    const expected = JSON.parse(readFileSync(path.join(caseDir, "expected-cells.json"), "utf8")) as ExpectedCells;
    const pdf = new Uint8Array(readFileSync(path.join(caseDir, "presupuesto-escaneado.pdf")));
    const budget = await readBudgetPdf(pdf, catalog());
    assertCaloxCells(budget, expected);
  }, 360_000);
});

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedSalons, seedSectionMappings } from "../config/seed-data";
import { parseBudget, type BudgetCatalog } from "../budget/parse-budget";
import { extractPdfFragments } from "../../lib/pdf-text";
import { lineText, groupLines } from "../budget/fragments";
import { maskFragment, type ClientMaskData } from "./mask";

describe("maskFragment", () => {
  it("sustituye cliente y teléfono y elimina el monto", () => {
    const masked = maskFragment(
      "La empresa Droguería Nena confirma (0412) 5243150 y USD 4.500,00.",
      {
        company: "Droguería Nena",
        phones: "(0412) 5243150",
      },
    );

    expect(masked).toContain("[CLIENTE]");
    expect(masked).toContain("[TELEFONO]");
    expect(masked).not.toContain("Droguería Nena");
    expect(masked).not.toContain("5243150");
    expect(masked).not.toContain("4.500,00");
    expect(masked).not.toContain("4500");
  });

  it("elimina montos con paréntesis, guiones y formato estadounidense", () => {
    const masked = maskFragment("Tarifas ( 25,00) y - 58,50- más 1,234.56.", {});
    expect(masked).not.toContain("25,00");
    expect(masked).not.toContain("58,50");
    expect(masked).not.toContain("1,234.56");
  });

  it("enmascara correo, RIF y un número largo suelto", () => {
    const masked = maskFragment("Escribir a ana@hotel.com, RIF J-123456789, ref 1234567.", {
      email: "ana@hotel.com",
      rif: "J-123456789",
    });
    expect(masked).toContain("[CORREO]");
    expect(masked).toContain("[RIF]");
    expect(masked).toContain("[NUMERO]");
    expect(masked).not.toContain("ana@hotel.com");
    expect(masked).not.toContain("J-123456789");
    expect(masked).not.toContain("1234567");
  });
});

const fixtureDir = path.join(process.cwd(), "fixtures", "presupuestos");

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

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function leaks(masked: string, client: ClientMaskData): string | null {
  const haystack = masked.toLowerCase();
  const pieces = [client.company, client.contact, client.address, client.email, client.rif];
  for (const piece of pieces) {
    const value = piece?.trim();
    if (value && value.length >= 3 && haystack.includes(value.toLowerCase())) {
      return "dato de cliente";
    }
  }
  for (const phone of client.phones?.split(/[/;,]/) ?? []) {
    const serial = digits(phone);
    if (serial.length >= 7 && digits(masked).includes(serial)) {
      return "teléfono";
    }
  }
  return null;
}

describe.skipIf(!existsSync(fixtureDir))("enmascarado de fixtures", () => {
  it("no deja datos del cliente en los fragmentos reales", async () => {
    const names = readdirSync(fixtureDir).filter(
      (name) => name.toLowerCase().endsWith(".pdf") && !name.endsWith("_1.pdf"),
    );
    expect(names.length).toBeGreaterThanOrEqual(9);

    for (const name of names) {
      const data = new Uint8Array(readFileSync(path.join(fixtureDir, name)));
      const fragments = await extractPdfFragments(data);
      const budget = await parseBudget(fragments, { catalog: catalog() });
      const client: ClientMaskData = budget.client;
      const samples = [
        [client.company, client.contact, client.phones, client.address, client.email, client.rif]
          .filter(Boolean)
          .join(" "),
        ...groupLines(fragments).map((line) => lineText(line)),
      ];

      for (const sample of samples) {
        if (!sample.trim()) {
          continue;
        }
        const masked = maskFragment(sample, client);
        expect(leaks(masked, client), name).toBeNull();
      }
    }
  });
});

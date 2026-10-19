import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfFragments } from "../../lib/pdf-text";
import { proposeBeos } from "../beo/propose";
import { parseBudget, type BudgetCatalog } from "../budget/parse-budget";
import { currentFixedTexts } from "../config/fixed-texts";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedFixedTexts, seedMemoType, seedSalons, seedSectionMappings } from "../config/seed-data";
import { planMemoFields, type MemoBeoSource } from "./content";

const budgets = path.join(process.cwd(), "fixtures", "presupuestos");
const available = existsSync(budgets);
const texts = currentFixedTexts(seedFixedTexts);
const keyword = "tarifa plana de estacionamiento";

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
    keywords: [keyword],
  };
}

async function read(match: string) {
  const name = readdirSync(budgets).find((file) => file.toLowerCase().includes(match.toLowerCase()) && file.endsWith(".pdf"));
  if (!name) {
    throw new Error(`No está el presupuesto ${match}.`);
  }
  const data = new Uint8Array(readFileSync(path.join(budgets, name)));
  return parseBudget(await extractPdfFragments(data), { catalog: catalog() });
}

function sources(budget: Awaited<ReturnType<typeof read>>): MemoBeoSource[] {
  return proposeBeos(budget, texts).map((draft) => ({
    date: draft.date,
    salon: draft.salonName.value,
    kind: draft.kind,
    billboard: draft.billboard.value ?? "",
    billboardConfirmed: draft.billboard.status === "RULE",
  }));
}

describe.skipIf(!available)("memorándum de los eventos con tarifa plana", () => {
  it.each(["Almuerzo FARMA 2", "A&M FARMA", "Nena", "Leti"])(
    "%s propone el memo y usa los salones de sus B.E.O.",
    async (match) => {
    const budget = await read(match);
    expect(budget.triggers).toContain(keyword);
    const beos = sources(budget);
    const fields = planMemoFields({
      type: { ...seedMemoType, excludeSetupDays: true },
      beos,
      signer: { name: "Ana Pérez", title: "Asistente de Ventas" },
      number: "89",
      issuedOn: new Date("2026-10-15T16:30:00.000Z"),
      eventTitle: budget.eventTitle ?? "",
    });
    const body = fields.find((field) => field.key === "cuerpo")?.value ?? "";
    const eventBeos = beos.some((beo) => beo.kind === "EVENTO") ? beos.filter((beo) => beo.kind === "EVENTO") : beos;
    for (const salon of new Set(eventBeos.map((beo) => beo.salon.trim()).filter(Boolean))) {
      expect(body).toContain(salon);
    }
    expect(body).toContain("tarifa plana");
    expect(fields.find((field) => field.key === "de")?.value).toBe("Ana Pérez");
    },
  );

  it("no propone memorándum si el presupuesto no menciona la tarifa", async () => {
    const budget = await read("Alta Cocina");
    expect(budget.triggers).not.toContain(keyword);
  });
});

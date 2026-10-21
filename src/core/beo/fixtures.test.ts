import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfFragments } from "../../lib/pdf-text";
import { parseBudget, type BudgetCatalog } from "../budget/parse-budget";
import { currentFixedTexts } from "../config/fixed-texts";
import { normalizeLabel } from "../config/normalize";
import { seedCatalogItems, seedFixedTexts, seedSalons, seedSectionMappings } from "../config/seed-data";
import { proposeBeos } from "./propose";

const budgets = path.join(process.cwd(), "fixtures", "presupuestos");
const beos = path.join(process.cwd(), "fixtures", "beo");
const available = existsSync(budgets) && existsSync(beos);
const texts = currentFixedTexts(seedFixedTexts);

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

async function proposeFile(part: string) {
  const name = readdirSync(budgets).find((file) => file.includes(part) && !file.endsWith("_1.pdf"));
  if (!name) {
    throw new Error(`No está el presupuesto ${part}.`);
  }
  const parsed = await parseBudget(
    await extractPdfFragments(new Uint8Array(readFileSync(path.join(budgets, name)))),
    { catalog: catalog() },
  );
  return proposeBeos(parsed, texts);
}

async function beoText(part: string): Promise<string> {
  const name = readdirSync(beos).find((file) => file.includes(part));
  if (!name) {
    throw new Error(`No está la B.E.O. ${part}.`);
  }
  const pages = await extractPdfFragments(new Uint8Array(readFileSync(path.join(beos, name))));
  return pages.map((page) => page.text).join("\n");
}

describe.skipIf(!available)("propuesta contra los presupuestos de ejemplo", () => {
  it("propone 6 B.E.O. para Reumatología y parte la renta de Topacio", async () => {
    const drafts = await proposeFile("Evento 3");
    expect(drafts).toHaveLength(6);
    const topacio = drafts.filter((draft) => draft.salon === "Topacio" && draft.kind === "EVENTO");
    expect(topacio.map((draft) => draft.formattedDate.value)).toEqual(["23.10.2026", "24.10.2026"]);
    expect(topacio.map((draft) => draft.rentCents.value)).toEqual([292500, 292500]);
    const setup = drafts.find((draft) => draft.kind === "MONTAJE" && draft.salon === "Zafiro");
    expect(setup?.guarantee.value).toBeNull();
    expect(setup?.guarantee.status).toBe("RULE");
    expect(setup?.guarantee.source).toBe("rule:rn-19");
    expect(setup?.rentCents.value).toBeNull();
    expect(setup?.weekday.value).toBe("Jueves");
    expect(setup?.billboard.value).toContain("REUMATOLOG");
    expect(setup?.billboard.status).toBe("PENDING");
  });

  it("propone tantas B.E.O. de salón como las emitidas de Congreso Pets", async () => {
    const drafts = await proposeFile("Congreso Pets");
    const issued = readdirSync(beos).filter(
      (name) => name.toUpperCase().includes("PETS") && !name.toUpperCase().includes("INTERNET"),
    );
    expect(drafts).toHaveLength(issued.length);
  });

  it("propone una B.E.O. para Federación China", async () => {
    const drafts = await proposeFile("Federación China");
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.salon).toBe("Plaza Real");
    expect(drafts[0]?.formattedDate.value).toBe("07.10.2026");
    expect(drafts[0]?.weekday.value).toBe("Miércoles");
    expect(drafts[0]?.guarantee.value).toBe(700);
    expect(drafts[0]?.rentCents.value).toBe(741500);
    expect(drafts[0]?.eventType.value).toBe("Cena");
    const groups = drafts[0]?.sections.find((section) => section.section === "PERSONAL")?.groups.map((group) => group.name);
    expect(groups).toEqual(["Montaje", "Evento", "Desmontaje"]);
  });

  it("compara fechas y salones con las B.E.O. emitidas, sin exigir los ajustes posteriores", async () => {
    const china = (await proposeFile("Federación China"))[0];
    const chinaText = await beoText("0.830");
    expect(chinaText).toContain(china?.formattedDate.value);
    expect(chinaText).toContain("7.415,00");
    expect(chinaText).toContain("700");

    const farma = (await proposeFile("Almuerzo FARMA"))[0];
    const farmaText = await beoText("0.932");
    expect(farma?.kind).toBe("MONTAJE");
    expect(farma?.salon).toBe("Zafiro");
    expect(farma?.guarantee.value).toBe(150);
    expect(farma?.rentCents.value).toBeNull();
    expect(farmaText).toContain("23.10.2026");
    expect(farmaText).toContain("Zafiro");

    const reuma = await proposeFile("Evento 3");
    const reumaText = [
      await beoText("0.933"),
      await beoText("0.934"),
      await beoText("0.935"),
      await beoText("0.936"),
      await beoText("0.937"),
      await beoText("0.938"),
    ].join("\n");
    for (const draft of reuma) {
      expect(reumaText).toContain(draft.formattedDate.value);
      expect(reumaText).toContain(draft.salon);
    }
    const issuedSetup = await beoText("0.933");
    expect(issuedSetup).toContain("22.10.2026");
    expect(issuedSetup).toContain("Zafiro");

    const nena = await proposeFile("Nena");
    const diamante = nena.find((draft) => draft.date === "2026-10-22" && draft.salon === "Diamante");
    expect(diamante?.needsReview).toBe(true);
    expect(diamante?.rentCents.value).toBeNull();
    expect(diamante?.guarantee.value).toBe(300);
    const nenaText = await beoText("0.928");
    expect(nenaText).toContain("22.10.2026");
    expect(nenaText).toContain("Diamante");
    expect(nenaText.toLowerCase()).toContain("desmontaje");
    const teardown =
      diamante?.sections
        .find((section) => section.section === "PERSONAL")
        ?.groups.find((group) => group.name === "Desmontaje")
        ?.lines.map((line) => line.description) ?? [];
    expect(teardown).toEqual(
      expect.arrayContaining(["Supervisor", "Limpiador / Acomodador", "Oficial de seguridad"]),
    );
    const unclassified = nena
      .flatMap((draft) => draft.sections)
      .filter((section) => section.section === "")
      .flatMap((section) => section.groups)
      .flatMap((group) => group.lines)
      .map((line) => line.description);
    expect(unclassified).toEqual([]);
  });
});

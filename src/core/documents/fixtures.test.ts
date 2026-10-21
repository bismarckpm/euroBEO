import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { extractPdfFragments } from "../../lib/pdf-text";
import { parseBudget, type BudgetCatalog } from "../budget/parse-budget";
import { currentFixedTexts } from "../config/fixed-texts";
import { normalizeLabel } from "../config/normalize";
import {
  seedCatalogItems,
  seedFixedTexts,
  seedSalons,
  seedSectionMappings,
} from "../config/seed-data";
import type { BeoDraft } from "../beo/model";
import { proposeBeos } from "../beo/propose";
import { draftToTemplateData } from "./beo-template-data";
import { countPages } from "./count-pages";
import { onlySystems, withoutSystems } from "./page-fit";
import { convertToPdf, PdfConversionError } from "./convert-pdf";
import { renderDocx } from "./render-docx";

const budgets = path.join(process.cwd(), "fixtures", "presupuestos");
const beos = path.join(process.cwd(), "fixtures", "beo");
const available = existsSync(budgets) && existsSync(beos);
const texts = currentFixedTexts(seedFixedTexts);
const template = existsSync(path.join(process.cwd(), "templates", "beo.docx"))
  ? readFileSync(path.join(process.cwd(), "templates", "beo.docx"))
  : Buffer.alloc(0);

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
  return proposeBeos(
    await parseBudget(
      await extractPdfFragments(new Uint8Array(readFileSync(path.join(budgets, name)))),
      {
        catalog: catalog(),
      },
    ),
    texts,
  );
}

function weight(draft: BeoDraft): number {
  return (
    draft.food.length +
    draft.sections.reduce(
      (sum, section) =>
        sum + section.groups.reduce((inner, group) => inner + group.lines.length, 0),
      0,
    )
  );
}

function visible(docx: Buffer): string {
  const xml = new PizZip(docx).file("word/document.xml")?.asText() ?? "";
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1] ?? "").join("\n");
}

describe.skipIf(!available)("B.E.O. de los presupuestos reales", () => {
  it("llena la plantilla de Federación China con los datos que comparte la 0.830", async () => {
    const draft = (await proposeFile("Federación China"))[0];
    if (!draft) {
      throw new Error("No hubo propuesta.");
    }
    const issuedName = readdirSync(beos).find((file) => file.includes("0.830"));
    if (!issuedName) {
      throw new Error("No está la B.E.O. 0.830.");
    }
    const issued = (
      await extractPdfFragments(new Uint8Array(readFileSync(path.join(beos, issuedName))))
    )
      .map((fragment) => fragment.text)
      .join("\n");
    const docx = renderDocx(
      template,
      draftToTemplateData(draft, {
        eventTitle: draft.billboard.value ?? "Evento",
        number: "0.830/26",
        preparedOn: "18/10/2026",
        iniciales: "JG/AR",
      }),
    );
    const text = visible(docx);
    expect(text).toContain("ORDEN DE SERVICIO");
    expect(text).toContain("GARANTÍA");
    expect(text).toContain("ALIMENTOS Y BEBIDAS");
    expect(text).toContain("7.415,00");
    expect(text).toContain("700");
    expect(text).toContain(draft.formattedDate.value);
    expect(issued).toContain("ORDEN DE SERVICIO");
    expect(issued).toContain("7.415,00");
    expect(issued).toContain("700");
    expect(issued).toContain(draft.formattedDate.value);

    try {
      const pdf = await convertToPdf(docx);
      expect(await countPages(pdf)).toBe(1);
    } catch (error) {
      if (!(error instanceof PdfConversionError) || !error.message.includes("No se encontró")) {
        throw error;
      }
    }
  }, 90_000);

  it("usa el día más cargado de Congreso Pets y separa Sistemas si no cabe", async () => {
    const drafts = await proposeFile("Congreso Pets");
    const busiest = drafts.reduce((best, draft) => (weight(draft) > weight(best) ? draft : best));
    const data = draftToTemplateData(busiest, {
      eventTitle: busiest.billboard.value ?? "Evento",
      number: "0.850/26",
      preparedOn: "18/10/2026",
      iniciales: "JG/AR",
    });
    const docx = renderDocx(template, data);
    const text = visible(docx);
    expect(weight(busiest)).toBeGreaterThan(0);
    expect(text).toContain(busiest.formattedDate.value);
    const sample =
      busiest.food[0]?.description.split("\n")[0] ??
      busiest.sections[0]?.groups[0]?.lines[0]?.text;
    if (sample) {
      expect(text.replaceAll("\u00A0", " ")).toContain(sample.split("\n")[0]);
    }
    if (data.rightSections.some((section) => section.title === "SISTEMAS")) {
      let pdf: Buffer;
      try {
        pdf = await convertToPdf(docx);
      } catch (error) {
        if (error instanceof PdfConversionError && error.message.includes("No se encontró")) {
          return;
        }
        throw error;
      }
      const pages = await countPages(pdf);
      if (pages > 1) {
        expect(await countPages(await convertToPdf(renderDocx(template, withoutSystems(data))))).toBe(1);
        expect(await countPages(await convertToPdf(renderDocx(template, onlySystems(data))))).toBe(1);
      }
    }
  }, 90_000);
});

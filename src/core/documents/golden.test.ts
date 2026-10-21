import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { personnelLine } from "../beo/format";
import type { BeoDraft } from "../beo/model";
import { proposeBeos } from "../beo/propose";
import { defaultEventTypes, type BeoSettings } from "../beo/presentation";
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
import { draftToTemplateData, type BeoTemplateData } from "./beo-template-data";
import { applyPriceOverrides, proposeFragments, templatesFor, type GoldenAssignment } from "./golden-build";
import { convertToPdf, findSoffice } from "./convert-pdf";
import { renderDocx } from "./render-docx";

const exec = promisify(execFile);
const root = path.join(process.cwd(), "fixtures", "golden");
const dir = path.join(root, "cata-eleaexeltis");

type ManifestCase = { id: string; status: "ready" | "pending"; reason?: string };

function manifestCases(): ManifestCase[] {
  const file = path.join(root, "manifest.json");
  if (!existsSync(file)) {
    throw new Error("Falta fixtures/golden/manifest.json.");
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { cases?: ManifestCase[] };
  const cases = parsed.cases ?? [];
  for (const entry of cases) {
    if (entry.status === "pending" && !entry.reason?.trim()) {
      throw new Error(`El caso ${entry.id} está pending sin motivo.`);
    }
  }
  return cases;
}

function listPending(cases: ManifestCase[]): void {
  const pending = cases.filter((entry) => entry.status === "pending");
  if (pending.length === 0) {
    return;
  }
  console.info(["Casos dorados pendientes:", ...pending.map((entry) => `- ${entry.id}: ${entry.reason}`)].join("\n"));
}

function referenceImages(caseDir: string): string[] {
  if (!existsSync(caseDir)) {
    return [];
  }
  return readdirSync(caseDir)
    .filter((name) => name === "reference.png" || /^reference-.+\.png$/i.test(name))
    .sort();
}

function commandExists(command: string): boolean {
  try {
    execFileSync(command, ["-v"], { stdio: "ignore" });
    return true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    return code !== "ENOENT";
  }
}

async function requireVisualTools(): Promise<void> {
  if (!(await findSoffice())) {
    throw new Error("Falta LibreOffice (soffice). Dentro del contenedor la comparación visual no se omite.");
  }
  if (!commandExists("pdftoppm")) {
    throw new Error("Falta pdftoppm. Dentro del contenedor la comparación visual no se omite.");
  }
}

const settings: BeoSettings = {
  presentation: {
    eventHeaderSource: "client",
    dateFormat: "dd/mm/yy",
    uppercaseDayAndContact: true,
    setupLabel: "Montaje:",
    serviceLabel: "Servicio Evento:",
    teardownLabel: "Desmontaje:",
    tableCalculation: true,
  },
  eventTypes: defaultEventTypes,
};

const staffPrices: Record<string, number> = {
  "Montaje|Supervisor": 5400,
  "Montaje|Limpiador / Acomodador": 3000,
  "Montaje|Asistente de servicio": 3600,
  "Evento|Supervisor": 5400,
  "Evento|Limpiador / Acomodador": 3000,
  "Evento|Asistente de Servicio": 3600,
  "Evento|Cocineros": 3600,
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

function applyFinalValues(draft: BeoDraft): void {
  for (const section of draft.sections) {
    for (const group of section.groups) {
      for (const line of group.lines) {
        const cents = staffPrices[`${group.name}|${line.description}`];
        if (cents !== undefined) {
          line.unitPriceCents = cents;
          line.text = personnelLine(line.qty, line.description, cents);
        }
        if (line.description === "Agua Mineral") {
          line.description = "Agua Mineral 330 ml";
          line.text = personnelLine(line.qty, line.description, line.unitPriceCents);
        }
      }
    }
  }
  draft.company = { value: "LABORATORIOS ELEAEXELTIS", status: "RULE", source: "manual" };
}

function comparable(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replaceAll("\u00A0", " ");
  }
  if (Array.isArray(value)) {
    return value.map((entry) => comparable(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, comparable(entry)]),
    );
  }
  return value;
}

function diffFields(actual: unknown, expected: unknown, prefix = ""): string[] {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    return [];
  }
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object" || Array.isArray(actual) || Array.isArray(expected)) {
    return [`${prefix || "raíz"}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`];
  }
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  return [...keys].flatMap((key) =>
    diffFields(
      (actual as Record<string, unknown>)[key],
      (expected as Record<string, unknown>)[key],
      prefix ? `${prefix}.${key}` : key,
    ),
  );
}

async function cataData(): Promise<BeoTemplateData> {
  const budget = await parseBudget(
    await extractPdfFragments(new Uint8Array(readFileSync(path.join(dir, "presupuesto.pdf")))),
    { catalog: catalog() },
  );
  const draft = proposeBeos(budget, currentFixedTexts(seedFixedTexts), settings)[0];
  if (!draft) {
    throw new Error("La cata no produjo una B.E.O.");
  }
  applyFinalValues(draft);
  return draftToTemplateData(draft, {
    eventTitle: draft.billboard.value ?? "",
    number: "0.955/26",
    preparedOn: "19/10/2026",
    iniciales: "JG/AR",
    settings,
  });
}

const reumaAssignments: GoldenAssignment[] = [
  { date: "2026-10-22", salon: "Zafiro", number: "0.933/26" },
  { date: "2026-10-22", salon: "Topacio", number: "0.934/26" },
  { date: "2026-10-23", salon: "Topacio", number: "0.935/26" },
  { date: "2026-10-24", salon: "Topacio", number: "0.936/26" },
  { date: "2026-10-23", salon: "Zafiro", number: "0.937/26" },
  { date: "2026-10-24", salon: "Zafiro", number: "0.938/26" },
];

async function assignedCase(
  caseId: string,
  assignments: GoldenAssignment[],
  preparedOn: string,
): Promise<BeoTemplateData[]> {
  const pdf = readFileSync(path.join(root, caseId, "presupuesto.pdf"));
  const drafts = await proposeFragments(await extractPdfFragments(new Uint8Array(pdf)), settings);
  const parsed = JSON.parse(readFileSync(path.join(root, caseId, "final-values.json"), "utf8")) as {
    priceOverrides?: Record<string, number>;
  };
  for (const draft of drafts) {
    applyPriceOverrides(draft, parsed.priceOverrides ?? {});
  }
  return templatesFor(drafts, assignments, preparedOn, "JG/AP", settings);
}

describe("casos dorados", () => {
  it("lista los pendientes y exige referencia en los casos listos", () => {
    const cases = manifestCases();
    listPending(cases);
    expect(cases.some((entry) => entry.id === "cata-eleaexeltis" && entry.status === "ready")).toBe(true);
    for (const entry of cases) {
      if (entry.status === "pending") {
        continue;
      }
      const caseDir = path.join(root, entry.id);
      expect(existsSync(path.join(caseDir, "presupuesto.pdf")), `${entry.id} presupuesto`).toBe(true);
      expect(existsSync(path.join(caseDir, "expected.json")), `${entry.id} expected`).toBe(true);
      if (referenceImages(caseDir).length === 0) {
        throw new Error(
          `El caso ${entry.id} no tiene reference.png y no está declarado con status pending y un motivo.`,
        );
      }
    }
  });

  it("Reumatología 0.933 a 0.938 coincide con los datos esperados", async () => {
    const actual = comparable(await assignedCase("reumatologia", reumaAssignments, "15/10/2026"));
    const expected = comparable(JSON.parse(readFileSync(path.join(root, "reumatologia", "expected.json"), "utf8")));
    const fields = diffFields(actual, expected);
    expect(fields, fields.slice(0, 12).join("\n")).toEqual([]);
    expect(JSON.stringify(actual)).not.toContain("15/00/2026");
  });

  it("Nena 0.928 coincide con los datos esperados", async () => {
    const actual = comparable(
      await assignedCase("nena", [{ date: "2026-10-22", salon: "Diamante", number: "0.928/26" }], "16/10/2026"),
    );
    const expected = comparable(JSON.parse(readFileSync(path.join(root, "nena", "expected.json"), "utf8")));
    const fields = diffFields(actual, expected);
    expect(fields, fields.slice(0, 12).join("\n")).toEqual([]);
  });

  it("la cata coincide con los datos de la B.E.O. 0.955/26", async () => {
    const actual = comparable(await cataData()) as BeoTemplateData;
    const expected = comparable(JSON.parse(readFileSync(path.join(dir, "expected.json"), "utf8"))) as BeoTemplateData;
    const fields = diffFields(actual, expected);
    expect(fields, fields.slice(0, 12).join("\n")).toEqual([]);
  });

  it("compara la imagen de la cata con la referencia", async () => {
    await requireVisualTools();
    const reference = path.join(dir, "reference.png");
    if (!existsSync(reference)) {
      throw new Error("cata-eleaexeltis no tiene reference.png y no está declarado pending.");
    }
    const template = readFileSync(path.join(process.cwd(), "templates", "beo.docx"));
    const pdf = await convertToPdf(renderDocx(template, await cataData()));
    const work = path.join(process.cwd(), "data", "golden-diff");
    mkdirSync(work, { recursive: true });
    const pdfPath = path.join(work, "cata.pdf");
    writeFileSync(pdfPath, pdf);
    await exec("pdftoppm", ["-png", "-r", "100", "-singlefile", pdfPath, path.join(work, "actual")]);
    const { default: pixelmatch } = await import("pixelmatch");
    const { PNG } = await import("pngjs");
    const expectedImage = PNG.sync.read(readFileSync(reference));
    const actualImage = PNG.sync.read(readFileSync(path.join(work, "actual.png")));
    expect(actualImage.width).toBe(expectedImage.width);
    expect(actualImage.height).toBe(expectedImage.height);
    const diff = new PNG({ width: expectedImage.width, height: expectedImage.height });
    const mismatched = pixelmatch(
      expectedImage.data,
      actualImage.data,
      diff.data,
      expectedImage.width,
      expectedImage.height,
      { threshold: 0.1 },
    );
    const ratio = mismatched / (expectedImage.width * expectedImage.height);
    if (ratio > 0.01) {
      writeFileSync(path.join(dir, "diff.png"), PNG.sync.write(diff));
    }
    expect(ratio).toBeLessThanOrEqual(0.01);
  });

  it("compara las imágenes de Reumatología y de Nena", async () => {
    await requireVisualTools();
    const template = readFileSync(path.join(process.cwd(), "templates", "beo.docx"));
    const reuma = await assignedCase("reumatologia", reumaAssignments, "15/10/2026");
    const nena = await assignedCase("nena", [{ date: "2026-10-22", salon: "Diamante", number: "0.928/26" }], "16/10/2026");
    const pages = [
      ...reuma.map((data) => ({
        data,
        reference: path.join(root, "reumatologia", `reference-${data.numero.slice(0, 5)}.png`),
        diff: path.join(root, "reumatologia", `diff-${data.numero.slice(0, 5)}.png`),
      })),
      ...nena.map((data) => ({
        data,
        reference: path.join(root, "nena", "reference.png"),
        diff: path.join(root, "nena", "diff.png"),
      })),
    ];
    for (const page of pages) {
      expect(existsSync(page.reference), page.reference).toBe(true);
      const pdf = await convertToPdf(renderDocx(template, page.data));
      const work = path.join(process.cwd(), "data", "golden-diff");
      mkdirSync(work, { recursive: true });
      const pdfPath = path.join(work, "page.pdf");
      writeFileSync(pdfPath, pdf);
      const stem = path.join(work, "page");
      await exec("pdftoppm", ["-png", "-r", "100", "-singlefile", pdfPath, stem]);
      const { default: pixelmatch } = await import("pixelmatch");
      const { PNG } = await import("pngjs");
      const expectedImage = PNG.sync.read(readFileSync(page.reference));
      const actualImage = PNG.sync.read(readFileSync(`${stem}.png`));
      expect(actualImage.width).toBe(expectedImage.width);
      expect(actualImage.height).toBe(expectedImage.height);
      const diff = new PNG({ width: expectedImage.width, height: expectedImage.height });
      const mismatched = pixelmatch(
        expectedImage.data,
        actualImage.data,
        diff.data,
        expectedImage.width,
        expectedImage.height,
        { threshold: 0.1 },
      );
      const ratio = mismatched / (expectedImage.width * expectedImage.height);
      if (ratio > 0.01) {
        writeFileSync(page.diff, PNG.sync.write(diff));
      }
      expect(ratio, page.reference).toBeLessThanOrEqual(0.01);
    }
  });
});

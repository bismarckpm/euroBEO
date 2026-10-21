import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { personnelLine } from "../beo/format";
import type { BeoDraft } from "../beo/model";
import type { TextFragment } from "../budget/fragments";
import { extractPdfFragments } from "../../lib/pdf-text";
import type { BeoTemplateData } from "./beo-template-data";
import { applyPriceOverrides, goldenSettings, proposeFragments, templatesFor } from "./golden-build";

const manifestCaseSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "pending"]),
  reason: z.string().optional(),
});

const manifestSchema = z.object({
  cases: z.array(manifestCaseSchema),
});

export type GoldenManifestCase = z.infer<typeof manifestCaseSchema>;

const pricedLine = /^(\d+)\s+(.+?)\s+(?:USD\s+)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+)\s+c\/u$/i;

const cataFinalSchema = z.object({
  beoNumber: z.string().min(1),
  preparedDate: z.string().min(1),
  initials: z.string().min(1),
  header: z.object({ compania: z.string() }).passthrough(),
  staff: z.object({
    setup: z.array(z.string()),
    service: z.array(z.string()),
    teardown: z.array(z.string()).default([]),
  }),
});

const assignedBeoSchema = z.object({
  number: z.string().min(1),
  date: z.string().min(1),
  salon: z.string().min(1),
});

const reumaFinalSchema = z.object({
  preparedOn: z.string().min(1),
  initials: z.string().min(1),
  beos: z.array(assignedBeoSchema).min(1),
  priceOverrides: z.record(z.string(), z.number()).optional(),
});

const nenaFinalSchema = z.object({
  number: z.string().min(1),
  preparedOn: z.string().min(1),
  initials: z.string().min(1),
  date: z.string().min(1),
  salon: z.string().min(1),
  priceOverrides: z.record(z.string(), z.number()).optional(),
});

export function goldenRoot(cwd = process.cwd()): string {
  return path.join(cwd, "fixtures", "golden");
}

export function readManifest(root = goldenRoot()): GoldenManifestCase[] {
  const file = path.join(root, "manifest.json");
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  for (const entry of parsed.cases) {
    if (entry.status === "pending" && !entry.reason?.trim()) {
      throw new Error(`El caso ${entry.id} está pending sin motivo.`);
    }
  }
  return parsed.cases;
}

export function pendingLines(cases: GoldenManifestCase[]): string[] {
  return cases
    .filter((entry) => entry.status === "pending")
    .map((entry) => `${entry.id}: ${entry.reason}`);
}

/** `0.955/26` → `0.955`, nombre de archivo de la línea base. */
export function baselineStem(number: string): string {
  const stem = number.split("/")[0]?.trim();
  if (!stem || stem.includes("..") || stem.includes("/") || stem.includes("\\")) {
    throw new Error("El número de B.E.O. no sirve como nombre de línea base.");
  }
  return stem;
}

/** Fecha impresa del caso (`dd/mm/aa`, `dd.mm.aaaa` o ISO) a la fecha del borrador. */
export function printedDateToIso(value: string): string {
  const slash = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (slash) {
    return `20${slash[3]}-${slash[2]}-${slash[1]}`;
  }
  const dots = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (dots) {
    return `${dots[3]}-${dots[2]}-${dots[1]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  throw new Error("La fecha de final-values no es dd/mm/aa, dd.mm.aaaa ni ISO.");
}

export function centsFromAmount(amount: string): number {
  const value = Number(amount.replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(value)) {
    throw new Error("El monto ajustado no es un número.");
  }
  return Math.round(value * 100);
}

/** Precios confirmados en las líneas de personal de `final-values.json`. */
export function staffPriceOverrides(groups: { group: string; lines: string[] }[]): Record<string, number> {
  const overrides: Record<string, number> = {};
  for (const group of groups) {
    for (const line of group.lines) {
      const match = pricedLine.exec(line.trim());
      if (!match) {
        continue;
      }
      overrides[`${group.group}|${match[2]}`] = centsFromAmount(match[3] ?? "");
    }
  }
  return overrides;
}

function applyCataAdjustments(draft: BeoDraft, finals: z.infer<typeof cataFinalSchema>): void {
  applyPriceOverrides(
    draft,
    staffPriceOverrides([
      { group: "Montaje", lines: finals.staff.setup },
      { group: "Evento", lines: finals.staff.service },
      { group: "Desmontaje", lines: finals.staff.teardown },
    ]),
  );
  for (const section of draft.sections) {
    for (const group of section.groups) {
      for (const line of group.lines) {
        if (line.description === "Agua Mineral") {
          line.description = "Agua Mineral 330 ml";
          line.text = personnelLine(line.qty, line.description, line.unitPriceCents);
        }
      }
    }
  }
  draft.company = { value: finals.header.compania, status: "RULE", source: "final-values" };
}

export function baselineNumbers(caseId: string, finalValues: unknown): string[] {
  if (caseId === "cata-eleaexeltis") {
    return [cataFinalSchema.parse(finalValues).beoNumber];
  }
  if (caseId === "reumatologia") {
    return reumaFinalSchema.parse(finalValues).beos.map((beo) => beo.number);
  }
  if (caseId === "nena") {
    return [nenaFinalSchema.parse(finalValues).number];
  }
  throw new Error(`El caso ${caseId} no tiene generación de línea base.`);
}

export async function goldenPages(caseId: string, fragments: TextFragment[], finalValues: unknown): Promise<BeoTemplateData[]> {
  if (caseId === "cata-eleaexeltis") {
    const finals = cataFinalSchema.parse(finalValues);
    const drafts = await proposeFragments(fragments, goldenSettings);
    const draft = drafts[0];
    if (!draft) {
      throw new Error("La cata no produjo una B.E.O.");
    }
    applyCataAdjustments(draft, finals);
    return templatesFor(
      [draft],
      [{ date: draft.date, salon: draft.salonName.value, number: finals.beoNumber }],
      finals.preparedDate,
      finals.initials,
      goldenSettings,
    );
  }

  if (caseId === "reumatologia") {
    const finals = reumaFinalSchema.parse(finalValues);
    const drafts = await proposeFragments(fragments, goldenSettings);
    for (const draft of drafts) {
      applyPriceOverrides(draft, finals.priceOverrides ?? {});
    }
    return templatesFor(
      drafts,
      finals.beos.map((beo) => ({
        date: printedDateToIso(beo.date),
        salon: beo.salon,
        number: beo.number,
      })),
      finals.preparedOn,
      finals.initials,
      goldenSettings,
    );
  }

  if (caseId === "nena") {
    const finals = nenaFinalSchema.parse(finalValues);
    const drafts = await proposeFragments(fragments, goldenSettings);
    for (const draft of drafts) {
      applyPriceOverrides(draft, finals.priceOverrides ?? {});
    }
    return templatesFor(
      drafts,
      [{ date: printedDateToIso(finals.date), salon: finals.salon, number: finals.number }],
      finals.preparedOn,
      finals.initials,
      goldenSettings,
    );
  }

  throw new Error(`El caso ${caseId} no tiene generación de línea base.`);
}

export async function loadGoldenPages(caseId: string, root = goldenRoot()): Promise<BeoTemplateData[]> {
  const caseDir = path.join(root, caseId);
  const fragments = await extractPdfFragments(new Uint8Array(readFileSync(path.join(caseDir, "presupuesto.pdf"))));
  const finalValues = JSON.parse(readFileSync(path.join(caseDir, "final-values.json"), "utf8")) as unknown;
  return goldenPages(caseId, fragments, finalValues);
}

export function readCaseFinalValues(caseId: string, root = goldenRoot()): unknown {
  return JSON.parse(readFileSync(path.join(root, caseId, "final-values.json"), "utf8")) as unknown;
}

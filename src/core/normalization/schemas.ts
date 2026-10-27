import { z } from "zod";
import { BEO_SECTIONS, type BeoSection } from "../config/sections";

export const NORMALIZATION_TASKS = ["block_fields", "item_section", "trigger_clause"] as const;

export type NormalizationTask = (typeof NORMALIZATION_TASKS)[number];

export function isNormalizationTask(value: string): value is NormalizationTask {
  return (NORMALIZATION_TASKS as readonly string[]).includes(value);
}

export type ClosedCatalog = {
  salons: string[];
  sections: readonly BeoSection[];
  memoTypes: string[];
  keywords: string[];
};

export const blockFieldsSchema = z.object({
  salonCandidates: z.array(z.string()).default([]),
  scheduleStart: z.string().nullable().default(null),
  scheduleEnd: z.string().nullable().default(null),
  setupType: z.string().nullable().default(null),
  pax: z.number().int().nullable().default(null),
});

export const itemSectionSchema = z.object({
  target: z.string().nullable(),
});

export const triggerClauseSchema = z.object({
  memoTypeKey: z.string().nullable(),
});

export type BlockFieldsResult = {
  salon: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  setupType: string | null;
  pax: number | null;
};

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyCatalog(): ClosedCatalog {
  return { salons: [], sections: BEO_SECTIONS, memoTypes: [], keywords: [] };
}

export function promptFor(task: NormalizationTask, catalog: ClosedCatalog): string {
  const shared = "Responde solo un objeto JSON. No inventes datos que no estén en el fragmento.";
  if (task === "block_fields") {
    return [
      "Interpretas el horario, el montaje y el pax de un bloque de evento. No interpretes el lugar.",
      shared,
      "Claves: scheduleStart, scheduleEnd (HH:MM de 24 horas o null), setupType (string o null), pax (entero o null).",
    ].join("\n");
  }
  if (task === "item_section") {
    return [
      "Clasificas una descripción de presupuesto en una sección.",
      shared,
      "Clave: target, uno de los valores permitidos o null.",
      `Secciones permitidas: ${catalog.sections.join(", ")}.`,
    ].join("\n");
  }
  return [
    "Decides si un beneficio o una cláusula dispara un memorándum.",
    shared,
    "Clave: memoTypeKey, uno de los valores permitidos o null.",
    `Memorándums permitidos: ${catalog.memoTypes.join(", ") || "ninguno"}.`,
  ].join("\n");
}

function officialSalon(name: string, catalog: ClosedCatalog): string | null {
  const key = name.trim().toLowerCase();
  return catalog.salons.find((salon) => salon.toLowerCase() === key) ?? null;
}

function clock(value: string | null): string | null {
  const text = value?.trim() ?? "";
  return CLOCK.test(text) ? text : null;
}

/** Acepta solo lo que pertenece al catálogo y a un rango válido. Lo demás queda en null. */
export function validateBlockFields(
  payload: unknown,
  catalog: ClosedCatalog,
): BlockFieldsResult | null {
  const parsed = blockFieldsSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  const salon = parsed.data.salonCandidates
    .map((candidate) => officialSalon(candidate, catalog))
    .find((candidate): candidate is string => candidate !== null);
  const pax = parsed.data.pax;
  const setup = parsed.data.setupType?.trim() ?? "";
  return {
    salon: salon ?? null,
    scheduleStart: clock(parsed.data.scheduleStart),
    scheduleEnd: clock(parsed.data.scheduleEnd),
    setupType: setup.length > 0 && setup.length <= 80 ? setup : null,
    pax: pax !== null && pax >= 1 && pax <= 10000 ? pax : null,
  };
}

export function validateItemSection(payload: unknown, catalog: ClosedCatalog): BeoSection | null {
  const parsed = itemSectionSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.target) {
    return null;
  }
  return catalog.sections.find((section) => section === parsed.data.target) ?? null;
}

export function validateTrigger(payload: unknown, catalog: ClosedCatalog): string | null {
  const parsed = triggerClauseSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  if (!parsed.data.memoTypeKey) {
    return null;
  }
  return catalog.memoTypes.find((memo) => memo === parsed.data.memoTypeKey) ?? null;
}

import { personnelLine } from "../beo/format";
import type { BeoDraft } from "../beo/model";
import { proposeBeos } from "../beo/propose";
import { defaultEventTypes, type BeoSettings } from "../beo/presentation";
import type { TextFragment } from "../budget/fragments";
import type { BudgetCatalog } from "../budget/parse-budget";
import { parseBudget } from "../budget/parse-budget";
import { currentFixedTexts } from "../config/fixed-texts";
import { normalizeLabel } from "../config/normalize";
import {
  seedCatalogItems,
  seedFixedTexts,
  seedSalons,
  seedSectionMappings,
} from "../config/seed-data";
import { draftToTemplateData, type BeoTemplateData } from "./beo-template-data";

export type GoldenAssignment = { date: string; salon: string; number: string };

export const goldenSettings: BeoSettings = {
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

export function goldenCatalog(): BudgetCatalog {
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

export async function proposeFragments(fragments: TextFragment[], settings: BeoSettings): Promise<BeoDraft[]> {
  const budget = await parseBudget(fragments, { catalog: goldenCatalog() });
  return proposeBeos(budget, currentFixedTexts(seedFixedTexts), settings);
}

/** Precios confirmados en la B.E.O. de la asistente, clave `grupo|descripción`. */
export function applyPriceOverrides(draft: BeoDraft, overrides: Record<string, number>): void {
  const lines = [
    ...draft.food.map((line) => ({ group: line.group, line })),
    ...draft.sections.flatMap((section) =>
      section.groups.flatMap((group) => group.lines.map((line) => ({ group: group.name || line.group, line }))),
    ),
  ];
  for (const entry of lines) {
    const cents = overrides[`${entry.group}|${entry.line.description}`];
    if (cents === undefined) {
      continue;
    }
    entry.line.unitPriceCents = cents;
    entry.line.text = personnelLine(entry.line.qty, entry.line.description, cents);
  }
}

export function templatesFor(
  drafts: BeoDraft[],
  assignments: GoldenAssignment[],
  preparedOn: string,
  iniciales: string,
  settings: BeoSettings,
): BeoTemplateData[] {
  return assignments.map((assignment) => {
    const draft = drafts.find((item) => item.date === assignment.date && item.salonName.value === assignment.salon);
    if (!draft) {
      throw new Error(`No hay B.E.O. para ${assignment.salon} ${assignment.date}.`);
    }
    return draftToTemplateData(draft, {
      eventTitle: draft.billboard.value ?? "",
      number: assignment.number,
      preparedOn,
      iniciales,
      settings,
    });
  });
}

import type { ParsedBudget, Reconciliation, StructureError } from "./model";

export type BudgetUploadView = {
  company: string | null;
  contact: string | null;
  title: string | null;
  locator: string | null;
  subtotalCents: number | null;
  dayCount: number;
  blockCount: number;
  triggers: string[];
  benefits: string[];
  warnings: string[];
  structureErrors: StructureError[];
  reconciliation: Reconciliation;
};

export function toUploadView(budget: ParsedBudget): BudgetUploadView {
  return {
    company: budget.client.company,
    contact: budget.client.contact,
    title: budget.eventTitle,
    locator: budget.header.locator,
    subtotalCents: budget.totals.subtotal,
    dayCount: budget.days.length,
    blockCount: budget.days.reduce((count, day) => count + day.blocks.length, 0),
    triggers: budget.triggers,
    benefits: budget.benefits,
    warnings: budget.warnings,
    structureErrors: budget.structureErrors,
    reconciliation: budget.reconciliation,
  };
}

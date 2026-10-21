import type { BeoDraft, BeoField } from "../core/beo/model";
import { proposeBeos } from "../core/beo/propose";
import { currentFixedTexts } from "../core/config/fixed-texts";
import { recordAudit } from "./audit";
import { loadBudgetCatalog } from "./budget-catalog";
import { readBudgetPdf } from "./budget-ingest";
import { getBeoSettings, listFixedTexts } from "./catalog-db";
import { getPrisma } from "./db";
import { normalizeStoredBudget } from "./normalization";

export class BeoProposalError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BeoProposalError";
    this.status = status;
  }
}

function storedValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function fieldRows(draft: BeoDraft) {
  const entries: [string, BeoField<unknown>][] = [
    ["company", draft.company],
    ["contact", draft.contact],
    ["phone", draft.phone],
    ["address", draft.address],
    ["weekday", draft.weekday],
    ["formattedDate", draft.formattedDate],
    ["schedule", draft.schedule],
    ["eventType", draft.eventType],
    ["salonName", draft.salonName],
    ["guarantee", draft.guarantee],
    ["rentCents", draft.rentCents],
    ["billboard", draft.billboard],
    ["setup", draft.setup],
    ["specialInstructions", draft.specialInstructions],
    ["servicePreparation", draft.servicePreparation],
  ];
  return entries.map(([key, current]) => ({
    key,
    value: storedValue(current.value),
    status: current.status,
    source: current.source,
  }));
}

function lineRows(draft: BeoDraft) {
  const lines = [
    ...draft.food,
    ...draft.sections.flatMap((section) => section.groups.flatMap((group) => group.lines)),
  ];
  return lines.map((line, position) => ({
    position,
    section: line.section,
    groupName: line.group,
    qty: line.qty,
    description: line.description,
    unitPriceCents: line.unitPriceCents,
    text: line.text,
    status: line.status,
    source: line.source,
  }));
}

/** Genera la propuesta desde el último PDF normalizado y reemplaza los borradores del evento. */
export async function createBeoProposal(eventId: string) {
  const prisma = getPrisma();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { budgets: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!event || event.budgets.length === 0) {
    throw new BeoProposalError("No hay un presupuesto para este evento.", 404);
  }

  const budget = event.budgets[0];
  if (!budget) {
    throw new BeoProposalError("No hay un presupuesto para este evento.", 404);
  }
  const parsed = await normalizeStoredBudget(
    await readBudgetPdf(Uint8Array.from(budget.originalPdf), await loadBudgetCatalog()),
  );
  if (parsed.structureErrors.length > 0) {
    throw new BeoProposalError("El presupuesto tiene errores de estructura y no se puede proponer.", 422);
  }

  const texts = currentFixedTexts(await listFixedTexts());
  const drafts = proposeBeos(parsed, texts, await getBeoSettings());
  const saved = await prisma.$transaction(async (tx) => {
    await tx.beo.deleteMany({ where: { eventId, status: "draft" } });
    const rows = [];
    for (const [position, draft] of drafts.entries()) {
      rows.push(
        await tx.beo.create({
          data: {
            eventId,
            position,
            status: "draft",
            date: draft.date,
            salon: draft.salon,
            kind: draft.kind,
            needsReview: draft.needsReview,
            fields: { create: fieldRows(draft) },
            lines: { create: lineRows(draft) },
          },
        }),
      );
    }
    return rows;
  });

  await recordAudit({
    action: "beo.propose",
    entity: "Event",
    entityId: eventId,
    after: { count: saved.length, budgetId: budget.id },
  });

  return {
    proposals: saved.map((row) => ({
      id: row.id,
      date: row.date,
      salon: row.salon,
      kind: row.kind,
      needsReview: row.needsReview,
      status: "draft" as const,
    })),
  };
}

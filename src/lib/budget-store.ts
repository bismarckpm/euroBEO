import { Prisma } from "@prisma/client";
import type { ParsedBudget } from "../core/budget/model";
import type { BudgetBlock } from "../core/budget/model";
import { recordAudit } from "./audit";
import { getPrisma } from "./db";

export class DuplicateBudgetError extends Error {
  readonly eventId: string;

  constructor(eventId: string) {
    super("Ya existe un presupuesto con este localizador y cliente.");
    this.name = "DuplicateBudgetError";
    this.eventId = eventId;
  }
}

function itemRows(block: BudgetBlock) {
  let position = 0;
  return block.sections.flatMap((section) =>
    section.items.map((item) => {
      const row = {
        position,
        sectionHeader: section.headerRaw,
        sectionTarget: item.section.value ?? section.target.value,
        sectionStatus: item.section.status,
        qty: item.qty,
        description: item.description,
        nights: item.nights,
        unitPriceCents: item.unitPrice,
        totalCents: item.total,
        flags: item.flags,
      };
      position += 1;
      return row;
    }),
  );
}

/** Guarda el PDF y el modelo leído. Si el localizador y el cliente ya existen, exige confirmar la versión. */
export async function saveBudget(input: {
  budget: ParsedBudget;
  pdf: Uint8Array;
  fileName: string;
  newVersion: boolean;
  justification: string | null;
}) {
  const prisma = getPrisma();
  const company = input.budget.client.company ?? "";
  const locator = input.budget.header.locator ?? "";
  const existing = await prisma.budget.findFirst({
    where: {
      event: { locator, company: { equals: company, mode: "insensitive" } },
    },
    orderBy: { version: "desc" },
    include: { event: true },
  });

  if (existing && !input.newVersion) {
    throw new DuplicateBudgetError(existing.eventId);
  }

  const status = input.budget.reconciliation.ok ? "ready" : "justified";
  const saved = await prisma.$transaction(async (tx) => {
    const event = existing
      ? await tx.event.update({
          where: { id: existing.eventId },
          data: { title: input.budget.eventTitle ?? existing.event.title },
        })
      : await tx.event.create({
          data: {
            title: input.budget.eventTitle ?? "Evento",
            company,
            locator,
          },
        });

    return tx.budget.create({
      data: {
        eventId: event.id,
        version: existing ? existing.version + 1 : 1,
        fileName: input.fileName,
        originalPdf: Buffer.from(input.pdf),
        status,
        justification: input.justification,
        subtotalCents: input.budget.totals.subtotal,
        itemsSumCents: input.budget.reconciliation.actual,
        differenceCents: input.budget.reconciliation.difference,
        warnings: input.budget.warnings,
        structureErrors: input.budget.structureErrors as Prisma.InputJsonValue,
        benefits: {
          create: input.budget.benefits.map((text, position) => ({ position, text })),
        },
        days: {
          create: input.budget.days.map((day, dayIndex) => ({
            position: dayIndex,
            dates: day.dates,
            raw: day.raw,
            blocks: {
              create: day.blocks.map((block, blockIndex) => ({
                position: blockIndex,
                kind: block.kind,
                rawTitle: block.rawTitle,
                salonRaw: block.salonRaw,
                salonName: block.salon.value,
                salonStatus: block.salon.status,
                schedule: block.schedule.value,
                scheduleStatus: block.schedule.status,
                setup: block.setup.value,
                setupStatus: block.setup.status,
                pax: block.pax.value,
                paxStatus: block.pax.status,
                nights: block.nights,
                rentRegular: block.rent.regular,
                rentNet: block.rent.net,
                discountLabel: block.rent.discountLabel,
                courtesy: block.rent.courtesy,
                page: block.page,
                items: { create: itemRows(block) },
              })),
            },
          })),
        },
      },
    });
  });

  await recordAudit({
    action: "budget.upload",
    entity: "Budget",
    entityId: saved.id,
    after: {
      locator,
      company,
      version: saved.version,
      fileName: input.fileName,
      status,
    },
  });

  return saved;
}

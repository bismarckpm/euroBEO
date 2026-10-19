import { existsSync, readFileSync, readdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";
import { saveBudget } from "./budget-store";
import { loadBudgetCatalog } from "./budget-catalog";
import { getPrisma } from "./db";
import {
  getEventReview,
  mergeBeos,
  splitBeo,
  startGeneration,
  updateBeoField,
  updateBeoLine,
  updateSharedField,
  validateBeoField,
  ReviewError,
} from "./event-review";
import { readBudgetPdf } from "./budget-ingest";

const budgets = path.join(process.cwd(), "fixtures", "presupuestos");

function ensureDatabaseUrl(): boolean {
  if (process.env.DATABASE_URL) {
    return true;
  }
  const file = path.join(process.cwd(), ".env");
  if (!existsSync(file)) {
    return false;
  }
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^DATABASE_URL=(.*)$/.exec(line.trim());
    if (match?.[1]) {
      process.env.DATABASE_URL = match[1].replace(/^"|"$/g, "");
      return true;
    }
  }
  return false;
}

const ready = existsSync(budgets) && ensureDatabaseUrl();
const createdBudgetIds: string[] = [];

async function rheumatologyEvent(): Promise<string> {
  const name = readdirSync(budgets).find((file) => file.includes("Evento 3"));
  if (!name) {
    throw new Error("No está el presupuesto de Reumatología.");
  }
  const pdf = new Uint8Array(readFileSync(path.join(budgets, name)));
  const budget = await readBudgetPdf(pdf, await loadBudgetCatalog());
  budget.client.company = `Reumatología ${randomUUID()}`;
  budget.header.locator = randomUUID();
  const saved = await saveBudget({
    budget,
    pdf,
    fileName: name,
    newVersion: true,
    justification: null,
  });
  createdBudgetIds.push(saved.id);
  return saved.eventId;
}

describe.skipIf(!ready)("revisión del evento", () => {
  afterAll(async () => {
    if (!ready) {
      return;
    }
    const prisma = getPrisma();
    for (const budgetId of createdBudgetIds) {
      const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
      if (!budget) {
        continue;
      }
      await prisma.beo.deleteMany({ where: { eventId: budget.eventId } });
      await prisma.budget.delete({ where: { id: budgetId } });
      const remaining = await prisma.budget.count({ where: { eventId: budget.eventId } });
      if (remaining === 0) {
        await prisma.event.delete({ where: { id: budget.eventId } });
      }
    }
    await prisma.$disconnect();
  });

  it("lista 6 B.E.O., replica la cartelera y conserva una sobrescritura", async () => {
    const eventId = await rheumatologyEvent();
    const review = await getEventReview(eventId);
    expect(review.beos).toHaveLength(6);
    expect(review.beos.map((beo) => beo.date)).toEqual([...review.beos.map((beo) => beo.date)].sort());
    expect(review.pendingCount).toBeGreaterThan(0);

    const shared = await updateSharedField(eventId, "billboard", "CONGRESO NACIONAL DE REUMATOLOGÍA");
    expect(
      shared.beos.every(
        (beo) =>
          beo.fields.find((field) => field.key === "billboard")?.value ===
          "CONGRESO NACIONAL DE REUMATOLOGÍA",
      ),
    ).toBe(true);
    expect(
      shared.beos.every((beo) => beo.fields.find((field) => field.key === "billboard")?.status === "RULE"),
    ).toBe(true);

    const first = shared.beos[0];
    if (!first) {
      throw new Error("Falta la primera B.E.O.");
    }
    await updateBeoField({
      eventId,
      beoId: first.id,
      key: "billboard",
      value: "Cartelera propia",
      remember: false,
    });
    const again = await updateSharedField(eventId, "billboard", "CONGRESO NACIONAL DE REUMATOLOGÍA");
    const own = again.beos.find((beo) => beo.id === first.id)?.fields.find((field) => field.key === "billboard");
    expect(own?.value).toBe("Cartelera propia");
    expect(own?.source).toBe("beo.override");
  });

  it("valida un campo, ajusta un precio y lo deja en auditoría", async () => {
    const eventId = await rheumatologyEvent();
    const review = await getEventReview(eventId);
    const beo = review.beos.find((item) => item.fields.some((field) => field.status === "AI" || field.status === "PENDING"));
    const field = beo?.fields.find((item) => item.status === "AI" || item.status === "PENDING");
    const line = review.beos.flatMap((item) => item.lines)[0];
    if (!beo || !field || !line) {
      throw new Error("El presupuesto no dejó campos para revisar.");
    }

    const validated = await validateBeoField(eventId, beo.id, field.key);
    expect(validated.beos.find((item) => item.id === beo.id)?.fields.find((item) => item.key === field.key)?.status).toBe("RULE");

    const priced = await updateBeoLine({
      eventId,
      lineId: line.id,
      qty: line.qty,
      description: line.description,
      unitPrice: "36,00",
      section: line.section,
    });
    const updated = priced.beos.flatMap((item) => item.lines).find((item) => item.id === line.id);
    expect(updated?.unitPriceCents).toBe(3600);
    expect(updated?.text).toContain("USD 36,00 c/u");

    const audit = await getPrisma().auditLog.findFirst({
      where: { entityId: line.id, action: "beo.line.update" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit?.before).toBeTruthy();
    expect(audit?.after).toMatchObject({ unitPriceCents: 3600 });
  });

  it("une dos B.E.O. del mismo día y separa líneas sin perderlas", async () => {
    const eventId = await rheumatologyEvent();
    const review = await getEventReview(eventId);
    const sameDay = review.beos.filter((beo) => beo.date === review.beos[0]?.date);
    const target = sameDay[0];
    const source = sameDay[1];
    if (!target || !source) {
      throw new Error("El día no tiene dos B.E.O.");
    }
    const before = target.lines.length + source.lines.length;
    const merged = await mergeBeos(eventId, target.id, source.id);
    const kept = merged.beos.find((beo) => beo.id === target.id);
    expect(merged.beos.some((beo) => beo.id === source.id)).toBe(false);
    expect(kept?.lines).toHaveLength(before);

    const moving = kept?.lines[0];
    if (!moving) {
      throw new Error("No hay una línea para separar.");
    }
    const split = await splitBeo({
      eventId,
      beoId: target.id,
      salon: "Topacio",
      lineIds: [moving.id],
    });
    const created = split.beos.find((beo) => beo.lines.some((line) => line.id === moving.id));
    expect(created?.id).not.toBe(target.id);
    expect(created?.salon).toBe("Topacio");
    expect(split.beos.find((beo) => beo.id === target.id)?.lines.map((line) => line.id)).not.toContain(moving.id);
  });

  it("no inicia la generación con pendientes y sí cuando no queda ninguno", async () => {
    const eventId = await rheumatologyEvent();
    await getEventReview(eventId);
    await expect(startGeneration(eventId)).rejects.toBeInstanceOf(ReviewError);

    const prisma = getPrisma();
    const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
    await prisma.beoField.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    await prisma.beoLine.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    const blank = await PDFDocument.create();
    blank.addPage();
    const pdf = Buffer.from(await blank.save());
    try {
      const started = await startGeneration(eventId, { toPdf: async () => pdf });
      expect(started.started).toBe(true);
      expect(started.documents).toBeGreaterThan(0);
      expect(started.files[0]?.fileName).toMatch(/^B\.E\.O\. /);
      expect(started.files.some((file) => file.fileName.endsWith(".docx"))).toBe(true);
    } finally {
      if (before) {
        await prisma.sequence.update({
          where: { key: "beo" },
          data: { lastNumber: before.lastNumber, year: before.year },
        });
      }
      await prisma.generatedDocument.deleteMany({ where: { eventId } });
      await rm(path.join(process.cwd(), "data", "generated", eventId), { recursive: true, force: true });
    }
  });

  it("advierte un correlativo repetido y lo permite si la asistente lo confirma", async () => {
    const eventId = await rheumatologyEvent();
    await getEventReview(eventId);
    const prisma = getPrisma();
    const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
    await prisma.beoField.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    await prisma.beoLine.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    const blank = await PDFDocument.create();
    blank.addPage();
    const pdf = Buffer.from(await blank.save());
    const toPdf = async () => pdf;
    try {
      const first = await startGeneration(eventId, { toPdf, numbers: ["0.948/26"] });
      expect(first.files[0]?.number).toBe("0.948/26");
      await expect(startGeneration(eventId, { toPdf, numbers: ["0.948/26"] })).rejects.toThrow(/ya fue usado/);
      const retried = await startGeneration(eventId, { toPdf, numbers: ["0.948/26"], acknowledge: true });
      expect(retried.files[0]?.number).toBe("0.948/26");
    } finally {
      if (before) {
        await prisma.sequence.update({
          where: { key: "beo" },
          data: { lastNumber: before.lastNumber, year: before.year },
        });
      }
      await prisma.generatedDocument.deleteMany({ where: { eventId } });
      await rm(path.join(process.cwd(), "data", "generated", eventId), { recursive: true, force: true });
    }
  });

  it("recuerda la corrección de un salón", async () => {
    const eventId = await rheumatologyEvent();
    const review = await getEventReview(eventId);
    const beo = review.beos[0];
    const field = beo?.fields.find((item) => item.key === "salonName");
    if (!beo || !field) {
      throw new Error("Falta el salón.");
    }
    await getPrisma().beoField.update({
      where: { id: field.id },
      data: { value: "Plaza Caracas", status: "AI" },
    });
    await updateBeoField({
      eventId,
      beoId: beo.id,
      key: "salonName",
      value: "Diamante",
      remember: true,
    });
    const learned = await getPrisma().learnedNormalization.findFirst({
      where: { task: "block_fields", sourceText: "Plaza Caracas", active: true },
    });
    expect(learned).toBeTruthy();
    if (learned) {
      await getPrisma().learnedNormalization.delete({ where: { id: learned.id } });
    }
  });
});

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import PizZip from "pizzip";
import { afterAll, describe, expect, it } from "vitest";
import { looksLikeFood } from "../core/beo/classify";
import { saveBudget } from "./budget-store";
import { listMemos } from "./catalog-db";
import { loadBudgetCatalog } from "./budget-catalog";
import { eventDocumentZip } from "./beo-documents";
import { getPrisma } from "./db";
import {
  addBeoLine,
  addMemoToEvent,
  getEventReview,
  mergeBeos,
  regenerateMemo,
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

async function eventFrom(match: string): Promise<string> {
  const name = readdirSync(budgets).find(
    (file) => file.toLowerCase().includes(match.toLowerCase()) && file.endsWith(".pdf") && !file.endsWith("_1.pdf"),
  );
  if (!name) {
    throw new Error(`No está el presupuesto ${match}.`);
  }
  const pdf = new Uint8Array(readFileSync(path.join(budgets, name)));
  const budget = await readBudgetPdf(pdf, await loadBudgetCatalog());
  budget.client.company = `${match} ${randomUUID()}`;
  budget.header.locator = randomUUID();
  const saved = await saveBudget({
    budget,
    pdf,
    fileName: name,
    newVersion: true,
    justification: budget.reconciliation.ok ? null : "Cuadre de prueba",
  });
  createdBudgetIds.push(saved.id);
  return saved.eventId;
}

async function readyToGenerate(eventId: string, memoNumber: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.beoField.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
  await prisma.beoLine.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
  await prisma.memoField.updateMany({
    where: { memo: { eventId }, key: "numero" },
    data: { value: memoNumber, status: "RULE", source: "memo.edit" },
  });
  await prisma.memo.updateMany({ where: { eventId }, data: { number: memoNumber } });
  await prisma.memoField.updateMany({
    where: { memo: { eventId }, status: { not: "RULE" } },
    data: { status: "RULE" },
  });
  const lines = await prisma.beoLine.findMany({ where: { beo: { eventId } } });
  for (const line of lines) {
    if (
      looksLikeFood(line.description) &&
      line.section !== "ALIMENTOS" &&
      line.section !== "BEBIDAS" &&
      line.section !== "DESCORCHE"
    ) {
      await prisma.beoLine.update({
        where: { id: line.id },
        data: { section: "ALIMENTOS", groupName: "", status: "RULE", unitPriceCents: line.unitPriceCents ?? 0 },
      });
    } else if (!line.section.trim()) {
      await prisma.beoLine.update({
        where: { id: line.id },
        data: { section: "PERSONAL", groupName: line.groupName.trim() || "Evento", status: "RULE" },
      });
    } else if (line.section === "PERSONAL" && !line.groupName.trim()) {
      await prisma.beoLine.update({
        where: { id: line.id },
        data: { groupName: "Evento", status: "RULE" },
      });
    }
  }
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

  it("propone el memo de Nena, lo incluye en el zip y avisa si cambia una B.E.O.", async () => {
    const eventId = await eventFrom("Nena");
    const review = await getEventReview(eventId);
    expect(review.memos.map((memo) => memo.name)).toContain("Tarifa de estacionamiento");
    const body = review.memos[0]?.fields.find((field) => field.key === "cuerpo")?.value ?? "";
    const salons = [...new Set(review.beos.filter((beo) => beo.kind === "EVENTO").map((beo) => beo.salon))];
    for (const salon of salons) {
      expect(body).toContain(salon);
    }

    const prisma = getPrisma();
    const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
    await readyToGenerate(eventId, "89");
    const blank = await PDFDocument.create();
    blank.addPage();
    const pdf = Buffer.from(await blank.save());
    const toPdf = async () => pdf;
    try {
      const started = await startGeneration(eventId, { toPdf });
      expect(started.files.some((file) => file.kind === "memo" && file.fileName.startsWith("89 "))).toBe(true);
      const zip = await eventDocumentZip(eventId);
      const names = Object.keys(new PizZip(zip.bytes).files);
      expect(names.some((name) => name.startsWith("89 "))).toBe(true);
      expect(names.some((name) => name.startsWith("B.E.O."))).toBe(true);

      const eventBeo = review.beos.find((beo) => beo.kind === "EVENTO");
      if (!eventBeo) {
        throw new Error("Nena no tiene una B.E.O. de evento.");
      }
      await updateBeoField({
        eventId,
        beoId: eventBeo.id,
        key: "salonName",
        value: "Salon Memo",
        remember: false,
      });
      await startGeneration(eventId, { toPdf, acknowledge: true });
      const stale = await getEventReview(eventId);
      expect(stale.memos[0]?.stale).toBe(true);

      const regenerated = await regenerateMemo(eventId, eventBeo && stale.memos[0] ? stale.memos[0].id : "", toPdf);
      expect(regenerated.memos[0]?.stale).toBe(false);
      const memoFile = regenerated.files.find((file) => file.kind === "memo" && file.number === "89");
      const row = await prisma.generatedDocument.findFirst({ where: { id: memoFile?.id ?? "" } });
      const xml = new PizZip(await readFile(row?.docxPath ?? "")).file("word/document.xml")?.asText() ?? "";
      expect(xml.replace(/<[^>]+>/g, " ")).toContain("Salon Memo");
      expect(row?.version).toBe(2);
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

  it("agrega el memorándum a mano y también lo propone si el disparador está en las cláusulas", async () => {
    const manualEvent = await eventFrom("Reumatología 22 al 24.10.2026 - Evento 3");
    const before = await getEventReview(manualEvent);
    expect(before.memos).toHaveLength(0);
    const type = (await listMemos()).find((memo) => memo.name === "Tarifa de estacionamiento");
    if (!type) {
      throw new Error("No está el tipo de memorándum.");
    }
    const added = await addMemoToEvent(manualEvent, type.id);
    expect(added.memos).toHaveLength(1);
    expect(added.memos[0]?.fields.find((field) => field.key === "de")?.value).toBeTruthy();

    const china = await getEventReview(await eventFrom("China"));
    expect(china.memos.map((memo) => memo.name)).toContain("Tarifa de estacionamiento");
  });

  it("no guarda una línea sin descripción y sí al confirmarla", async () => {
    const prisma = getPrisma();
    const event = await prisma.event.create({
      data: {
        title: `Línea ${randomUUID()}`,
        company: "Cliente de prueba",
        locator: randomUUID(),
        beos: {
          create: {
            position: 0,
            status: "draft",
            date: "2026-10-27",
            salon: "Topacio",
            kind: "EVENTO",
          },
        },
      },
    });
    const beo = await prisma.beo.findFirst({ where: { eventId: event.id } });
    if (!beo) {
      throw new Error("No se creó la B.E.O.");
    }
    try {
      await expect(
        addBeoLine({
          eventId: event.id,
          beoId: beo.id,
          section: "ALIMENTOS",
          groupName: "",
          qty: 2,
          description: "   ",
          unitPrice: "3,00",
        }),
      ).rejects.toThrow(/descripción/);
      const saved = await addBeoLine({
        eventId: event.id,
        beoId: beo.id,
        section: "ALIMENTOS",
        groupName: "",
        qty: 2,
        description: "Agua",
        unitPrice: "3,00",
      });
      const line = saved.beos.flatMap((item) => item.lines).find((item) => item.description === "Agua");
      expect(line?.qty).toBe(2);
      expect(line?.unitPriceCents).toBe(300);
    } finally {
      await prisma.event.delete({ where: { id: event.id } });
    }
  });

  it("genera solo las B.E.O. o solo el memorándum", async () => {
    const eventId = await rheumatologyEvent();
    const prisma = getPrisma();
    const before = await prisma.sequence.findUnique({ where: { key: "beo" } });
    const memoBefore = await prisma.sequence.findUnique({ where: { key: "memo" } });
    const type = (await listMemos()).find((memo) => memo.name === "Tarifa de estacionamiento");
    if (!type) {
      throw new Error("No está el tipo de memorándum.");
    }
    await addMemoToEvent(eventId, type.id);
    await prisma.memoField.updateMany({
      where: { memo: { eventId } },
      data: { status: "RULE", source: "memo.edit", value: "Confirmado" },
    });
    await prisma.beoField.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    await prisma.beoLine.updateMany({ where: { beo: { eventId } }, data: { status: "RULE" } });
    const prepared = await getEventReview(eventId);
    expect(prepared.pendingCount).toBe(0);
    const blank = await PDFDocument.create();
    blank.addPage();
    const pdf = Buffer.from(await blank.save());
    const toPdf = async () => pdf;
    try {
      const memos = await startGeneration(eventId, { scope: "memos", toPdf });
      expect(memos.files.length).toBeGreaterThan(0);
      expect(memos.files.every((file) => file.kind === "memo")).toBe(true);
      const afterMemos = await prisma.sequence.findUnique({ where: { key: "beo" } });
      expect(afterMemos?.lastNumber).toBe(before?.lastNumber);

      const beos = await startGeneration(eventId, { scope: "beos", toPdf });
      expect(beos.files.length).toBeGreaterThan(0);
      expect(beos.files.every((file) => file.kind !== "memo")).toBe(true);
    } finally {
      if (before) {
        await prisma.sequence.update({
          where: { key: "beo" },
          data: { lastNumber: before.lastNumber, year: before.year },
        });
      }
      if (memoBefore) {
        await prisma.sequence.update({
          where: { key: "memo" },
          data: { lastNumber: memoBefore.lastNumber, year: memoBefore.year },
        });
      }
      await prisma.generatedDocument.deleteMany({ where: { eventId } });
      await rm(path.join(process.cwd(), "data", "generated", eventId), { recursive: true, force: true });
    }
  });
});

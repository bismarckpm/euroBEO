import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";
import { beoDownloadName } from "../core/documents/beo-template-data";
import { createMemoryDrive } from "../core/drive/memory";
import { DOCX_MIME } from "../core/drive/names";
import { getPrisma } from "./db";
import { compareDocumentVersions, listEvents } from "./event-history";
import { listEventDocuments, regenerateSelectedDocuments } from "./beo-documents";
import { voidBeo } from "./event-review";

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

const ready = ensureDatabaseUrl();
const created: string[] = [];

describe.skipIf(!ready)("historial de eventos", () => {
  afterAll(async () => {
    if (created.length === 0) return;
    await getPrisma().event.deleteMany({ where: { id: { in: created } } });
  });

  it("encuentra MED URO de Laboratorios Leti por cliente y por fecha", async () => {
    const prisma = getPrisma();
    const event = await prisma.event.create({
      data: {
        title: "MED URO",
        company: `Laboratorios Leti ${randomUUID()}`,
        locator: randomUUID(),
        beos: {
          create: {
            position: 0,
            status: "generated",
            date: "2026-10-23",
            salon: "Diamante",
            kind: "EVENTO",
          },
        },
      },
    });
    created.push(event.id);
    const byClient = await listEvents({ text: "Leti" });
    expect(byClient.events.some((item) => item.id === event.id && item.status === "generado")).toBe(
      true,
    );
    const byDate = await listEvents({ date: "23/10/2026" });
    expect(byDate.events.some((item) => item.id === event.id)).toBe(true);
  });

  it("regenera la misma B.E.O. como v2, la compara y no reutiliza un número anulado", async () => {
    const prisma = getPrisma();
    const template = await prisma.template.findFirst({ where: { type: "beo", active: true } });
    const sequence = await prisma.sequence.findUnique({ where: { key: "beo" } });
    if (!template || !sequence) {
      throw new Error("Falta la plantilla o el correlativo.");
    }
    const number = `0.${String(sequence.lastNumber + 1).padStart(3, "0")}/${String(sequence.year).padStart(2, "0")}`;
    const title = `Evento ${randomUUID()}`;
    const event = await prisma.event.create({
      data: {
        title,
        company: `Cliente ${randomUUID()}`,
        locator: randomUUID(),
        beos: {
          create: {
            position: 0,
            status: "generated",
            date: "2026-10-23",
            salon: "Diamante",
            kind: "EVENTO",
            fields: {
              create: { key: "schedule", value: "08:00 a 18:00", status: "RULE", source: "test" },
            },
          },
        },
      },
      include: { beos: true },
    });
    created.push(event.id);
    const beo = event.beos[0];
    if (!beo) {
      throw new Error("No se creó la B.E.O.");
    }
    const fileName = beoDownloadName(number, title, "docx");
    await prisma.generatedDocument.create({
      data: {
        eventId: event.id,
        beoId: beo.id,
        kind: "beo",
        version: 1,
        number,
        fileName,
        docxPath: path.join(process.cwd(), "data", "generated", "missing.docx"),
        pdfPath: path.join(process.cwd(), "data", "generated", "missing.pdf"),
        sha256: "abc",
        templateId: template.id,
        snapshot: [{ key: "schedule", value: "08:00 a 18:00" }],
      },
    });
    await prisma.beoField.updateMany({
      where: { beoId: beo.id, key: "schedule" },
      data: { value: "09:00 a 12:00" },
    });
    const blank = await PDFDocument.create();
    blank.addPage();
    const pdf = Buffer.from(await blank.save());
    const drive = createMemoryDrive();
    const folder = await drive.client.createFolder("raiz", "2027");
    await drive.client.upload({
      folderId: folder.id,
      name: fileName,
      mimeType: DOCX_MIME,
      body: Buffer.from("original"),
    });
    const regenerated = await regenerateSelectedDocuments(event.id, {
      beoIds: [beo.id],
      toPdf: async () => pdf,
      archive: {
        client: drive.client,
        rootFolderId: "raiz",
        now: new Date("2027-06-15T16:00:00.000Z"),
        wait: async () => undefined,
      },
    });
    expect(regenerated.files[0]?.number).toBe(number);
    expect(regenerated.files[0]?.version).toBe(2);
    expect(drive.files.some((file) => file.name === fileName.replace(".docx", " v2.docx"))).toBe(
      true,
    );
    expect(drive.files.filter((file) => file.name === fileName)).toHaveLength(1);
    const compared = await compareDocumentVersions(event.id, regenerated.files[0]?.id ?? "");
    expect(compared.changes).toContainEqual({
      key: "schedule",
      before: "08:00 a 18:00",
      after: "09:00 a 12:00",
    });

    await voidBeo(event.id, beo.id);
    const listed = await listEventDocuments(event.id);
    expect(listed.suggested).not.toContain(number);
    expect(listed.files.some((file) => file.voided)).toBe(true);
  });
});

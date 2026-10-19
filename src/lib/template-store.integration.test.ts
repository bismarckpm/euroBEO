import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getPrisma } from "./db";
import { saveTemplateVersion, TemplateError } from "./template-store";

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

const ready = ensureDatabaseUrl() && existsSync(path.join(process.cwd(), "templates", "beo.docx"));
const createdIds: string[] = [];

describe.skipIf(!ready)("plantilla de B.E.O.", () => {
  afterAll(async () => {
    if (!ready) {
      return;
    }
    const prisma = getPrisma();
    for (const id of createdIds) {
      const row = await prisma.template.findUnique({ where: { id } });
      if (!row) {
        continue;
      }
      await prisma.template.delete({ where: { id } });
      await rm(row.filePath, { force: true });
    }
    await prisma.$disconnect();
  });

  it("rechaza una plantilla sin un marcador y acepta la del hotel", async () => {
    const previous = await getPrisma().template.findFirst({ where: { type: "beo", active: true } });
    await expect(saveTemplateVersion(Buffer.from("no es docx"))).rejects.toBeInstanceOf(TemplateError);
    try {
      await saveTemplateVersion(Buffer.from("no es docx"));
    } catch (error) {
      expect(error).toBeInstanceOf(TemplateError);
      expect((error as TemplateError).message).toMatch(/marcador|plantilla|\.docx/);
    }

    const saved = await saveTemplateVersion(readFileSync(path.join(process.cwd(), "templates", "beo.docx")));
    createdIds.push(saved.id);
    expect(saved.active).toBe(true);
    expect(saved.version).toBeGreaterThan(0);

    const broken = new (await import("pizzip")).default();
    broken.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{numero}</w:t></w:r></w:p></w:body></w:document>`,
    );
    broken.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`,
    );
    await expect(saveTemplateVersion(broken.generate({ type: "nodebuffer" }) as Buffer)).rejects.toThrow(
      /Falta el marcador \{preparadoEl\}/,
    );
    if (previous) {
      await getPrisma().template.update({ where: { id: previous.id }, data: { active: true } });
    }
  });
});

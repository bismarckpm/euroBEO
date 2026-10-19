import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";
import { missingMarkers } from "../core/documents/beo-template-data";
import { getPrisma } from "./db";

export class TemplateError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TemplateError";
    this.status = status;
  }
}

export function bundledTemplatePath(): string {
  return path.join(process.cwd(), "templates", "beo.docx");
}

export async function listTemplates() {
  return getPrisma().template.findMany({
    where: { type: "beo" },
    orderBy: { version: "desc" },
  });
}

/** Plantilla activa. Si no hay ninguna registrada, usa la que viene con la aplicación. */
export async function activeBeoTemplate() {
  const prisma = getPrisma();
  const current = await prisma.template.findFirst({
    where: { type: "beo", active: true },
    orderBy: { version: "desc" },
  });
  if (current) {
    try {
      await readFile(current.filePath);
      return current;
    } catch {
      await prisma.template.update({ where: { id: current.id }, data: { active: false } });
    }
  }
  const filePath = bundledTemplatePath();
  try {
    await readFile(filePath);
  } catch {
    throw new TemplateError("No está la plantilla de la B.E.O.", 500);
  }
  const latest = await prisma.template.findFirst({
    where: { type: "beo" },
    orderBy: { version: "desc" },
  });
  return prisma.template.create({
    data: {
      type: "beo",
      version: (latest?.version ?? 0) + 1,
      filePath,
      active: true,
    },
  });
}

/** Guarda una versión nueva solo si trae todos los marcadores. */
export async function saveTemplateVersion(bytes: Buffer) {
  let xml = "";
  try {
    xml = new PizZip(bytes).file("word/document.xml")?.asText() ?? "";
  } catch {
    throw new TemplateError("El archivo no es una plantilla .docx.", 400);
  }
  const missing = missingMarkers(xml);
  const marker = missing[0];
  if (marker) {
    throw new TemplateError(`Falta el marcador ${marker}.`, 400);
  }
  const prisma = getPrisma();
  const latest = await prisma.template.findFirst({
    where: { type: "beo" },
    orderBy: { version: "desc" },
  });
  const id = randomUUID();
  const filePath = path.join(process.cwd(), "data", "templates", `${id}.docx`);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  await prisma.template.updateMany({ where: { type: "beo", active: true }, data: { active: false } });
  return prisma.template.create({
    data: {
      id,
      type: "beo",
      version: (latest?.version ?? 0) + 1,
      filePath,
      active: true,
    },
  });
}

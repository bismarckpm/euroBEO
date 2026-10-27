import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import path from "node:path";
import { normalizeLabel } from "../src/core/config/normalize";
import {
  seedBlockHeaders,
  seedCatalogItems,
  seedFixedTexts,
  seedMemoType,
  seedSalons,
  seedSectionMappings,
  seedMemoSequence,
  seedSequence,
} from "../src/core/config/seed-data";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const prisma = new PrismaClient();

async function seedSalonsAndAliases(): Promise<void> {
  for (const entry of seedSalons) {
    const salon = await prisma.salon.upsert({
      where: { name: entry.name },
      create: { name: entry.name },
      update: {},
    });
    for (const label of entry.aliases) {
      const normalized = normalizeLabel(label);
      if (!normalized || normalized === normalizeLabel(entry.name)) {
        continue;
      }
      await prisma.salonAlias.upsert({
        where: { normalized },
        create: { salonId: salon.id, label, normalized },
        update: { salonId: salon.id, label },
      });
    }
  }
}

async function seedMappings(): Promise<void> {
  const entries = [
    ...seedSectionMappings.map((entry) => ({
      header: entry.header,
      section: entry.section,
    })),
    ...seedBlockHeaders.map((entry) => ({
      header: entry.header,
      section: entry.kind,
    })),
  ];
  for (const entry of entries) {
    const normalized = normalizeLabel(entry.header);
    await prisma.sectionMapping.upsert({
      where: { normalized },
      create: { header: entry.header, normalized, section: entry.section },
      update: { header: entry.header, section: entry.section },
    });
  }
}

async function seedItems(): Promise<void> {
  for (const entry of seedCatalogItems) {
    const normalized = normalizeLabel(entry.description);
    await prisma.catalogItem.upsert({
      where: { normalized },
      create: { ...entry, normalized },
      update: { description: entry.description, category: entry.category, section: entry.section },
    });
  }
}

async function seedTexts(): Promise<void> {
  for (const entry of seedFixedTexts) {
    const current = await prisma.fixedText.findUnique({ where: { key: entry.key } });
    if (!current) {
      await prisma.fixedText.create({ data: entry });
      continue;
    }
    await prisma.fixedText.update({
      where: { key: entry.key },
      data: {
        label: entry.label,
        body: current.body === "Pendiente" ? entry.body : current.body,
      },
    });
  }
}

async function seedMemo(): Promise<void> {
  const existing = await prisma.memoType.findUnique({ where: { name: seedMemoType.name } });
  if (!existing) {
    await prisma.memoType.create({ data: seedMemoType });
    return;
  }
  if (!existing.body.includes("Valet Parking")) {
    await prisma.memoType.update({
      where: { id: existing.id },
      data: {
        recipient: seedMemoType.recipient,
        company: seedMemoType.company,
        reference: seedMemoType.reference,
        body: seedMemoType.body,
        keywords: seedMemoType.keywords,
        templateFile: seedMemoType.templateFile,
      },
    });
  }
}

async function seedTemplate(): Promise<void> {
  const current = await prisma.template.findFirst({ where: { type: "beo", active: true } });
  if (current) return;
  await prisma.template.create({
    data: {
      type: "beo",
      version: 1,
      filePath: path.join(process.cwd(), "templates", "beo.docx"),
      active: true,
    },
  });
}

async function seedBeoSequence(): Promise<void> {
  await prisma.sequence.upsert({
    where: { key: seedSequence.key },
    create: seedSequence,
    update: {},
  });
  await prisma.sequence.upsert({
    where: { key: seedMemoSequence.key },
    create: seedMemoSequence,
    update: {},
  });
}

async function main(): Promise<void> {
  await seedSalonsAndAliases();
  await seedMappings();
  await seedItems();
  await seedTexts();
  await seedMemo();
  await seedTemplate();
  await seedBeoSequence();
  console.log("Configuración semilla lista.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

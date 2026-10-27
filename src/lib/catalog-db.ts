import { parseEventTypes, parsePresentation, type BeoSettings } from "../core/beo/presentation";
import { currentFixedTexts, type FixedTexts } from "../core/config/fixed-texts";
import {
  classifyCatalogItem,
  resolveSalonText,
  resolveSectionHeader,
  type SalonResolution,
  type SectionResolution,
} from "../core/config/resolve";
import { isBeoSection, type BeoSection } from "../core/config/sections";
import { formatBeoNumber, proposeNextBeoNumber } from "../core/config/sequence";
import { MEMO_SEQUENCE_KEY, proposeNextMemoNumber } from "../core/memo/number";
import {
  createAlias,
  createItem,
  createMapping,
  createMemo,
  createSalon,
  setMemoSequence,
  deleteAlias,
  deleteItem,
  deleteMapping,
  deleteMemo,
  deleteSalon,
  setSequence,
  updateFixedText,
  updateItem,
  updateMapping,
  updateMemo,
  updateSalon,
  type MemoInput,
} from "./catalog-mutations";
import { getPrisma } from "./db";
import { BEO_SEQUENCE_KEY } from "./sequence-lock";
import { assignNextNumber, peekNextNumber } from "./sequence-number";

function asSection(value: string): BeoSection {
  if (!isBeoSection(value)) {
    throw new Error(`Sección desconocida: ${value}`);
  }
  return value;
}

export async function listSalons() {
  return getPrisma().salon.findMany({
    include: { aliases: { orderBy: { label: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function listMappings() {
  return getPrisma().sectionMapping.findMany({ orderBy: { header: "asc" } });
}

export async function listItems() {
  return getPrisma().catalogItem.findMany({ orderBy: { description: "asc" } });
}

export async function listFixedTexts() {
  return getPrisma().fixedText.findMany({ orderBy: { label: "asc" } });
}

export async function listMemos() {
  return getPrisma().memoType.findMany({ orderBy: { name: "asc" } });
}

export async function readSequence() {
  const row = await getPrisma().sequence.findUnique({ where: { key: BEO_SEQUENCE_KEY } });
  if (!row) {
    return null;
  }
  return {
    lastNumber: row.lastNumber,
    year: row.year,
    last: formatBeoNumber(row.lastNumber, row.year),
    next: proposeNextBeoNumber(row.lastNumber, row.year),
  };
}

export async function readMemoSequence() {
  const row = await getPrisma().sequence.upsert({
    where: { key: MEMO_SEQUENCE_KEY },
    create: { key: MEMO_SEQUENCE_KEY, lastNumber: 0, year: 0 },
    update: {},
  });
  return {
    lastNumber: row.lastNumber,
    last: String(row.lastNumber),
    next: proposeNextMemoNumber(row.lastNumber),
  };
}

export async function resolveSalon(text: string): Promise<SalonResolution> {
  const salons = await listSalons();
  return resolveSalonText(
    text,
    salons.map((salon) => ({
      id: salon.id,
      name: salon.name,
      aliases: salon.aliases.map((alias) => ({ normalized: alias.normalized })),
    })),
  );
}

export async function resolveSection(header: string): Promise<SectionResolution> {
  const mappings = await listMappings();
  return resolveSectionHeader(
    header,
    mappings.map((mapping) => ({
      normalized: mapping.normalized,
      section: asSection(mapping.section),
    })),
  );
}

export async function classifyItem(description: string, section: BeoSection): Promise<BeoSection> {
  const items = await listItems();
  return classifyCatalogItem(
    description,
    section,
    items.map((item) => ({ normalized: item.normalized, section: asSection(item.section) })),
  );
}

export async function getFixedTexts(): Promise<FixedTexts> {
  const rows = await listFixedTexts();
  return currentFixedTexts(rows);
}

export async function getBeoSettings(): Promise<BeoSettings> {
  const rows = await listFixedTexts();
  const byKey = new Map(rows.map((row) => [row.key, row.body]));
  return {
    presentation: parsePresentation(byKey.get("beo_presentation") ?? ""),
    eventTypes: parseEventTypes(byKey.get("event_types") ?? ""),
  };
}

export async function getMemoTypes() {
  return listMemos();
}

export { assignNextNumber, peekNextNumber };

export async function saveSalon(name: string) {
  const prisma = getPrisma();
  return createSalon(
    { name },
    {
      byName: (value) => prisma.salon.findUnique({ where: { name: value }, select: { id: true } }),
      insert: (value) =>
        prisma.salon.create({ data: { name: value }, select: { id: true, name: true } }),
    },
  );
}

export async function renameSalon(id: string, name: string) {
  const prisma = getPrisma();
  return updateSalon(
    { id, name },
    {
      byId: (value) =>
        prisma.salon.findUnique({ where: { id: value }, select: { id: true, name: true } }),
      byName: (value) => prisma.salon.findUnique({ where: { name: value }, select: { id: true } }),
      update: (value, next) =>
        prisma.salon.update({
          where: { id: value },
          data: { name: next },
          select: { id: true, name: true },
        }),
    },
  );
}

export async function removeSalon(id: string) {
  const prisma = getPrisma();
  return deleteSalon(id, {
    byId: (value) =>
      prisma.salon.findUnique({ where: { id: value }, select: { id: true, name: true } }),
    delete: (value) => prisma.salon.delete({ where: { id: value } }).then(() => undefined),
  });
}

export async function saveAlias(salonId: string, label: string) {
  const prisma = getPrisma();
  return createAlias(
    { salonId, label },
    {
      salon: (id) => prisma.salon.findUnique({ where: { id }, select: { id: true, name: true } }),
      byNormalized: (normalized) =>
        prisma.salonAlias.findUnique({ where: { normalized }, select: { id: true } }),
      insert: (row) => prisma.salonAlias.create({ data: row }),
    },
  );
}

export async function removeAlias(id: string) {
  const prisma = getPrisma();
  return deleteAlias(id, {
    byId: (value) => prisma.salonAlias.findUnique({ where: { id: value } }),
    delete: (value) => prisma.salonAlias.delete({ where: { id: value } }).then(() => undefined),
  });
}

export async function saveMapping(header: string, section: string) {
  const prisma = getPrisma();
  return createMapping(
    { header, section },
    {
      byNormalized: (normalized) =>
        prisma.sectionMapping.findUnique({ where: { normalized }, select: { id: true } }),
      insert: (row) => prisma.sectionMapping.create({ data: row }),
    },
  );
}

export async function editMapping(id: string, header: string, section: string) {
  const prisma = getPrisma();
  return updateMapping(
    { id, header, section },
    {
      byId: (value) => prisma.sectionMapping.findUnique({ where: { id: value } }),
      byNormalized: (normalized) =>
        prisma.sectionMapping.findUnique({ where: { normalized }, select: { id: true } }),
      update: (value, row) => prisma.sectionMapping.update({ where: { id: value }, data: row }),
    },
  );
}

export async function removeMapping(id: string) {
  const prisma = getPrisma();
  return deleteMapping(id, {
    byId: (value) => prisma.sectionMapping.findUnique({ where: { id: value } }),
    delete: (value) => prisma.sectionMapping.delete({ where: { id: value } }).then(() => undefined),
  });
}

export async function saveItem(description: string, category: string, section: string) {
  const prisma = getPrisma();
  return createItem(
    { description, category, section },
    {
      byNormalized: (normalized) =>
        prisma.catalogItem.findUnique({ where: { normalized }, select: { id: true } }),
      insert: (row) => prisma.catalogItem.create({ data: row }),
    },
  );
}

export async function editItem(id: string, description: string, category: string, section: string) {
  const prisma = getPrisma();
  return updateItem(
    { id, description, category, section },
    {
      byId: (value) => prisma.catalogItem.findUnique({ where: { id: value } }),
      byNormalized: (normalized) =>
        prisma.catalogItem.findUnique({ where: { normalized }, select: { id: true } }),
      update: (value, row) => prisma.catalogItem.update({ where: { id: value }, data: row }),
    },
  );
}

export async function removeItem(id: string) {
  const prisma = getPrisma();
  return deleteItem(id, {
    byId: (value) => prisma.catalogItem.findUnique({ where: { id: value } }),
    delete: (value) => prisma.catalogItem.delete({ where: { id: value } }).then(() => undefined),
  });
}

export async function saveFixedTexts(entries: { key: string; body: string }[]) {
  for (const entry of entries) {
    await saveFixedText(entry.key, entry.body);
  }
}

export async function saveFixedText(key: string, body: string) {
  const prisma = getPrisma();
  return updateFixedText(
    { key, body },
    {
      byKey: (value) => prisma.fixedText.findUnique({ where: { key: value } }),
      update: (value, next) =>
        prisma.fixedText.update({
          where: { key: value },
          data: { body: next },
          select: { key: true, body: true },
        }),
    },
  );
}

export async function saveMemo(input: MemoInput) {
  const prisma = getPrisma();
  return createMemo(input, {
    byName: (name) => prisma.memoType.findUnique({ where: { name }, select: { id: true } }),
    insert: (row) => prisma.memoType.create({ data: row }),
  });
}

export async function editMemo(id: string, input: MemoInput) {
  const prisma = getPrisma();
  return updateMemo(
    { id, ...input },
    {
      byId: (value) => prisma.memoType.findUnique({ where: { id: value } }),
      byName: (name) => prisma.memoType.findUnique({ where: { name }, select: { id: true } }),
      update: (value, row) => prisma.memoType.update({ where: { id: value }, data: row }),
    },
  );
}

export async function removeMemo(id: string) {
  const prisma = getPrisma();
  return deleteMemo(id, {
    byId: (value) => prisma.memoType.findUnique({ where: { id: value } }),
    delete: (value) => prisma.memoType.delete({ where: { id: value } }).then(() => undefined),
  });
}

export async function saveSequence(code: string) {
  const prisma = getPrisma();
  return setSequence(
    { code },
    {
      read: async () => {
        const row = await prisma.sequence.findUnique({ where: { key: BEO_SEQUENCE_KEY } });
        return row ? { lastNumber: row.lastNumber, year: row.year } : null;
      },
      save: async (state) => {
        await prisma.sequence.upsert({
          where: { key: BEO_SEQUENCE_KEY },
          create: { key: BEO_SEQUENCE_KEY, ...state },
          update: state,
        });
      },
    },
  );
}

export async function saveMemoSequence(lastNumber: string) {
  const prisma = getPrisma();
  return setMemoSequence(
    { lastNumber },
    {
      read: async () => {
        const row = await prisma.sequence.findUnique({ where: { key: MEMO_SEQUENCE_KEY } });
        return row ? row.lastNumber : null;
      },
      save: async (value) => {
        await prisma.sequence.upsert({
          where: { key: MEMO_SEQUENCE_KEY },
          create: { key: MEMO_SEQUENCE_KEY, lastNumber: value, year: 0 },
          update: { lastNumber: value },
        });
      },
    },
  );
}

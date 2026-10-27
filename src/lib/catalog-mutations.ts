import { z } from "zod";
import { isFixedTextKey } from "../core/config/fixed-texts";
import { normalizeLabel } from "../core/config/normalize";
import { isBlockHeaderKind, type BlockHeaderKind } from "../core/config/block-headers";
import { isBeoSection, type BeoSection } from "../core/config/sections";
import { parseBeoNumber, type SequenceState } from "../core/config/sequence";
import { parseMemoNumber } from "../core/memo/number";
import { recordAudit, type AuditStore, type JsonValue } from "./audit";

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogValidationError";
  }
}

const requiredText = (max: number) => z.string().trim().min(1).max(max);

const salonName = requiredText(120);
const aliasLabel = requiredText(160);
const headerText = requiredText(160);
const categoryText = requiredText(80);
const longText = requiredText(4000);
const fileText = requiredText(240);

function parsed<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new CatalogValidationError(message);
  }
  return result.data;
}

type MappingDestination = BeoSection | BlockHeaderKind;

function sectionOf(value: string): BeoSection {
  const section = value.trim();
  if (!isBeoSection(section)) {
    throw new CatalogValidationError("La sección destino no es válida.");
  }
  return section;
}

function mappingDestination(value: string): MappingDestination {
  const destination = value.trim();
  if (isBeoSection(destination) || isBlockHeaderKind(destination)) {
    return destination;
  }
  throw new CatalogValidationError("La sección destino no es válida.");
}

function normalizedOrThrow(value: string, message: string): string {
  const normalized = normalizeLabel(value);
  if (!normalized) {
    throw new CatalogValidationError(message);
  }
  return normalized;
}

async function audit(
  entry: {
    action: string;
    entity: string;
    entityId: string;
    before?: JsonValue;
    after?: JsonValue;
  },
  store?: AuditStore,
): Promise<void> {
  await recordAudit(entry, store);
}

export type SalonRow = { id: string; name: string };

export async function createSalon(
  input: { name: string },
  db: {
    byName(name: string): Promise<{ id: string } | null>;
    insert(name: string): Promise<SalonRow>;
  },
  auditStore?: AuditStore,
): Promise<SalonRow> {
  const name = parsed(salonName, input.name, "El nombre del salón es obligatorio.");
  if (await db.byName(name)) {
    throw new CatalogValidationError("Ya existe un salón con ese nombre.");
  }
  const row = await db.insert(name);
  await audit(
    { action: "salon.create", entity: "Salon", entityId: row.id, after: { name: row.name } },
    auditStore,
  );
  return row;
}

export async function updateSalon(
  input: { id: string; name: string },
  db: {
    byId(id: string): Promise<SalonRow | null>;
    byName(name: string): Promise<{ id: string } | null>;
    update(id: string, name: string): Promise<SalonRow>;
  },
  auditStore?: AuditStore,
): Promise<SalonRow> {
  const name = parsed(salonName, input.name, "El nombre del salón es obligatorio.");
  const current = await db.byId(input.id);
  if (!current) {
    throw new CatalogValidationError("El salón no existe.");
  }
  const clash = await db.byName(name);
  if (clash && clash.id !== current.id) {
    throw new CatalogValidationError("Ya existe un salón con ese nombre.");
  }
  const row = await db.update(current.id, name);
  await audit(
    {
      action: "salon.update",
      entity: "Salon",
      entityId: row.id,
      before: { name: current.name },
      after: { name: row.name },
    },
    auditStore,
  );
  return row;
}

export async function deleteSalon(
  id: string,
  db: { byId(id: string): Promise<SalonRow | null>; delete(id: string): Promise<void> },
  auditStore?: AuditStore,
): Promise<void> {
  const current = await db.byId(id);
  if (!current) {
    throw new CatalogValidationError("El salón no existe.");
  }
  await db.delete(id);
  await audit(
    { action: "salon.delete", entity: "Salon", entityId: id, before: { name: current.name } },
    auditStore,
  );
}

export type AliasRow = { id: string; salonId: string; label: string; normalized: string };

export async function createAlias(
  input: { salonId: string; label: string },
  db: {
    salon(id: string): Promise<SalonRow | null>;
    byNormalized(normalized: string): Promise<{ id: string } | null>;
    insert(row: { salonId: string; label: string; normalized: string }): Promise<AliasRow>;
  },
  auditStore?: AuditStore,
): Promise<AliasRow> {
  const label = parsed(aliasLabel, input.label, "El alias es obligatorio.");
  const normalized = normalizedOrThrow(label, "El alias no puede ser solo la palabra salón.");
  const salon = await db.salon(input.salonId);
  if (!salon) {
    throw new CatalogValidationError("El salón no existe.");
  }
  if (normalized === normalizeLabel(salon.name)) {
    throw new CatalogValidationError("Ese alias ya coincide con el nombre oficial.");
  }
  if (await db.byNormalized(normalized)) {
    throw new CatalogValidationError("Ese alias ya existe.");
  }
  const row = await db.insert({ salonId: salon.id, label, normalized });
  await audit(
    {
      action: "salonAlias.create",
      entity: "SalonAlias",
      entityId: row.id,
      after: { label, salonId: salon.id, salon: salon.name },
    },
    auditStore,
  );
  return row;
}

export async function deleteAlias(
  id: string,
  db: { byId(id: string): Promise<AliasRow | null>; delete(id: string): Promise<void> },
  auditStore?: AuditStore,
): Promise<void> {
  const current = await db.byId(id);
  if (!current) {
    throw new CatalogValidationError("El alias no existe.");
  }
  await db.delete(id);
  await audit(
    {
      action: "salonAlias.delete",
      entity: "SalonAlias",
      entityId: id,
      before: { label: current.label, salonId: current.salonId },
    },
    auditStore,
  );
}

export type MappingRow = { id: string; header: string; normalized: string; section: string };

export async function createMapping(
  input: { header: string; section: string },
  db: {
    byNormalized(normalized: string): Promise<{ id: string } | null>;
    insert(row: { header: string; normalized: string; section: MappingDestination }): Promise<MappingRow>;
  },
  auditStore?: AuditStore,
): Promise<MappingRow> {
  const header = parsed(headerText, input.header, "El encabezado es obligatorio.");
  const section = mappingDestination(input.section);
  const normalized = normalizedOrThrow(header, "El encabezado no es válido.");
  if (await db.byNormalized(normalized)) {
    throw new CatalogValidationError("Ese encabezado ya está mapeado.");
  }
  const row = await db.insert({ header, normalized, section });
  await audit(
    {
      action: "sectionMapping.create",
      entity: "SectionMapping",
      entityId: row.id,
      after: { header, section },
    },
    auditStore,
  );
  return row;
}

export async function updateMapping(
  input: { id: string; header: string; section: string },
  db: {
    byId(id: string): Promise<MappingRow | null>;
    byNormalized(normalized: string): Promise<{ id: string } | null>;
    update(
      id: string,
      row: { header: string; normalized: string; section: MappingDestination },
    ): Promise<MappingRow>;
  },
  auditStore?: AuditStore,
): Promise<MappingRow> {
  const header = parsed(headerText, input.header, "El encabezado es obligatorio.");
  const section = mappingDestination(input.section);
  const normalized = normalizedOrThrow(header, "El encabezado no es válido.");
  const current = await db.byId(input.id);
  if (!current) {
    throw new CatalogValidationError("El mapeo no existe.");
  }
  const clash = await db.byNormalized(normalized);
  if (clash && clash.id !== current.id) {
    throw new CatalogValidationError("Ese encabezado ya está mapeado.");
  }
  const row = await db.update(current.id, { header, normalized, section });
  await audit(
    {
      action: "sectionMapping.update",
      entity: "SectionMapping",
      entityId: row.id,
      before: { header: current.header, section: current.section },
      after: { header, section },
    },
    auditStore,
  );
  return row;
}

export async function deleteMapping(
  id: string,
  db: { byId(id: string): Promise<MappingRow | null>; delete(id: string): Promise<void> },
  auditStore?: AuditStore,
): Promise<void> {
  const current = await db.byId(id);
  if (!current) {
    throw new CatalogValidationError("El mapeo no existe.");
  }
  await db.delete(id);
  await audit(
    {
      action: "sectionMapping.delete",
      entity: "SectionMapping",
      entityId: id,
      before: { header: current.header, section: current.section },
    },
    auditStore,
  );
}

export type ItemRow = {
  id: string;
  description: string;
  normalized: string;
  category: string;
  section: string;
};

export async function createItem(
  input: { description: string; category: string; section: string },
  db: {
    byNormalized(normalized: string): Promise<{ id: string } | null>;
    insert(row: {
      description: string;
      normalized: string;
      category: string;
      section: BeoSection;
    }): Promise<ItemRow>;
  },
  auditStore?: AuditStore,
): Promise<ItemRow> {
  const description = parsed(headerText, input.description, "La descripción es obligatoria.");
  const category = parsed(categoryText, input.category, "La categoría es obligatoria.");
  const section = sectionOf(input.section);
  const normalized = normalizedOrThrow(description, "La descripción no es válida.");
  if (await db.byNormalized(normalized)) {
    throw new CatalogValidationError("Ese ítem ya existe.");
  }
  const row = await db.insert({ description, normalized, category, section });
  await audit(
    {
      action: "catalogItem.create",
      entity: "CatalogItem",
      entityId: row.id,
      after: { description, category, section },
    },
    auditStore,
  );
  return row;
}

export async function updateItem(
  input: { id: string; description: string; category: string; section: string },
  db: {
    byId(id: string): Promise<ItemRow | null>;
    byNormalized(normalized: string): Promise<{ id: string } | null>;
    update(
      id: string,
      row: { description: string; normalized: string; category: string; section: BeoSection },
    ): Promise<ItemRow>;
  },
  auditStore?: AuditStore,
): Promise<ItemRow> {
  const description = parsed(headerText, input.description, "La descripción es obligatoria.");
  const category = parsed(categoryText, input.category, "La categoría es obligatoria.");
  const section = sectionOf(input.section);
  const normalized = normalizedOrThrow(description, "La descripción no es válida.");
  const current = await db.byId(input.id);
  if (!current) {
    throw new CatalogValidationError("El ítem no existe.");
  }
  const clash = await db.byNormalized(normalized);
  if (clash && clash.id !== current.id) {
    throw new CatalogValidationError("Ese ítem ya existe.");
  }
  const row = await db.update(current.id, { description, normalized, category, section });
  await audit(
    {
      action: "catalogItem.update",
      entity: "CatalogItem",
      entityId: row.id,
      before: {
        description: current.description,
        category: current.category,
        section: current.section,
      },
      after: { description, category, section },
    },
    auditStore,
  );
  return row;
}

export async function deleteItem(
  id: string,
  db: { byId(id: string): Promise<ItemRow | null>; delete(id: string): Promise<void> },
  auditStore?: AuditStore,
): Promise<void> {
  const current = await db.byId(id);
  if (!current) {
    throw new CatalogValidationError("El ítem no existe.");
  }
  await db.delete(id);
  await audit(
    {
      action: "catalogItem.delete",
      entity: "CatalogItem",
      entityId: id,
      before: { description: current.description, section: current.section },
    },
    auditStore,
  );
}

export async function updateFixedText(
  input: { key: string; body: string },
  db: {
    byKey(key: string): Promise<{ key: string; label: string; body: string } | null>;
    update(key: string, body: string): Promise<{ key: string; body: string }>;
  },
  auditStore?: AuditStore,
): Promise<{ key: string; body: string }> {
  if (!isFixedTextKey(input.key)) {
    throw new CatalogValidationError("El texto fijo no existe.");
  }
  const body = parsed(longText, input.body, "El texto es obligatorio.");
  const current = await db.byKey(input.key);
  if (!current) {
    throw new CatalogValidationError("El texto fijo no existe.");
  }
  const row = await db.update(input.key, body);
  await audit(
    {
      action: "fixedText.update",
      entity: "FixedText",
      entityId: input.key,
      before: { body: current.body },
      after: { body },
    },
    auditStore,
  );
  return row;
}

export type MemoInput = {
  name: string;
  recipient: string;
  company: string;
  reference: string;
  body: string;
  keywords: string;
  templateFile: string;
  excludeSetupDays?: boolean;
};

export type MemoRow = {
  id: string;
  name: string;
  recipient: string;
  company: string;
  reference: string;
  body: string;
  keywords: string[];
  templateFile: string;
  excludeSetupDays: boolean;
};

function parseMemo(input: MemoInput): Omit<MemoRow, "id"> {
  const keywords = input.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
  if (keywords.length === 0 || keywords.some((keyword) => keyword.length > 160)) {
    throw new CatalogValidationError("Indica al menos una palabra clave.");
  }
  return {
    name: parsed(salonName, input.name, "El nombre del memorándum es obligatorio."),
    recipient: parsed(headerText, input.recipient, "El destinatario es obligatorio."),
    company: parsed(headerText, input.company, "La empresa es obligatoria."),
    reference: parsed(headerText, input.reference, "La referencia es obligatoria."),
    body: parsed(longText, input.body, "El cuerpo es obligatorio."),
    keywords,
    templateFile: parsed(fileText, input.templateFile, "La plantilla .docx es obligatoria."),
    excludeSetupDays: input.excludeSetupDays ?? true,
  };
}

export async function createMemo(
  input: MemoInput,
  db: {
    byName(name: string): Promise<{ id: string } | null>;
    insert(row: Omit<MemoRow, "id">): Promise<MemoRow>;
  },
  auditStore?: AuditStore,
): Promise<MemoRow> {
  const memo = parseMemo(input);
  if (
    !memo.body.includes("{dias}") ||
    !memo.body.includes("{evento}") ||
    !memo.body.includes("{salones}")
  ) {
    throw new CatalogValidationError("El cuerpo debe incluir {dias}, {evento} y {salones}.");
  }
  if (await db.byName(memo.name)) {
    throw new CatalogValidationError("Ya existe un memorándum con ese nombre.");
  }
  const row = await db.insert(memo);
  await audit(
    {
      action: "memoType.create",
      entity: "MemoType",
      entityId: row.id,
      after: { name: row.name, keywords: row.keywords },
    },
    auditStore,
  );
  return row;
}

export async function updateMemo(
  input: MemoInput & { id: string },
  db: {
    byId(id: string): Promise<MemoRow | null>;
    byName(name: string): Promise<{ id: string } | null>;
    update(id: string, row: Omit<MemoRow, "id">): Promise<MemoRow>;
  },
  auditStore?: AuditStore,
): Promise<MemoRow> {
  const memo = parseMemo(input);
  if (
    !memo.body.includes("{dias}") ||
    !memo.body.includes("{evento}") ||
    !memo.body.includes("{salones}")
  ) {
    throw new CatalogValidationError("El cuerpo debe incluir {dias}, {evento} y {salones}.");
  }
  const current = await db.byId(input.id);
  if (!current) {
    throw new CatalogValidationError("El memorándum no existe.");
  }
  const clash = await db.byName(memo.name);
  if (clash && clash.id !== current.id) {
    throw new CatalogValidationError("Ya existe un memorándum con ese nombre.");
  }
  const row = await db.update(current.id, memo);
  await audit(
    {
      action: "memoType.update",
      entity: "MemoType",
      entityId: row.id,
      before: {
        name: current.name,
        recipient: current.recipient,
        body: current.body,
        keywords: current.keywords,
      },
      after: { name: row.name, recipient: row.recipient, body: row.body, keywords: row.keywords },
    },
    auditStore,
  );
  return row;
}

export async function deleteMemo(
  id: string,
  db: { byId(id: string): Promise<MemoRow | null>; delete(id: string): Promise<void> },
  auditStore?: AuditStore,
): Promise<void> {
  const current = await db.byId(id);
  if (!current) {
    throw new CatalogValidationError("El memorándum no existe.");
  }
  await db.delete(id);
  await audit(
    { action: "memoType.delete", entity: "MemoType", entityId: id, before: { name: current.name } },
    auditStore,
  );
}

export async function setSequence(
  input: { code: string },
  db: {
    read(): Promise<SequenceState | null>;
    save(state: SequenceState): Promise<void>;
  },
  auditStore?: AuditStore,
): Promise<SequenceState> {
  const parsedCode = parseBeoNumber(input.code);
  if (!parsedCode) {
    throw new CatalogValidationError("Usa el formato 0.947/26.");
  }
  const before = await db.read();
  await db.save(parsedCode);
  await audit(
    {
      action: "sequence.update",
      entity: "Sequence",
      entityId: "beo",
      before: before ? { lastNumber: before.lastNumber, year: before.year } : null,
      after: { lastNumber: parsedCode.lastNumber, year: parsedCode.year },
    },
    auditStore,
  );
  return parsedCode;
}

export async function setMemoSequence(
  input: { lastNumber: string },
  db: {
    read(): Promise<number | null>;
    save(lastNumber: number): Promise<void>;
  },
  auditStore?: AuditStore,
): Promise<number> {
  const parsed = parseMemoNumber(input.lastNumber);
  if (parsed === null) {
    throw new CatalogValidationError("El último número de memorándum debe ser un entero, por ejemplo 89.");
  }
  const before = await db.read();
  await db.save(parsed);
  await audit(
    {
      action: "sequence.update",
      entity: "Sequence",
      entityId: "memo",
      before: before === null ? null : { lastNumber: before },
      after: { lastNumber: parsed },
    },
    auditStore,
  );
  return parsed;
}

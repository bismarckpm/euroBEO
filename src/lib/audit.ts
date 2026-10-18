import { Prisma } from "@prisma/client";
import { getPrisma } from "./db";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AuditInput = {
  action: string;
  entity: string;
  entityId: string;
  before?: JsonValue;
  after?: JsonValue;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: JsonValue | null;
  after: JsonValue | null;
  createdAt: Date;
};

export interface AuditStore {
  insert(entry: Omit<AuditEntry, "id"> & { id?: string }): Promise<AuditEntry>;
}

type AuditDelegate = {
  create(args: {
    data: {
      action: string;
      entity: string;
      entityId: string;
      before: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      after: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      createdAt: Date;
    };
  }): Promise<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    before: Prisma.JsonValue | null;
    after: Prisma.JsonValue | null;
    createdAt: Date;
  }>;
};

function toJson(value: JsonValue | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function fromJson(value: Prisma.JsonValue | null): JsonValue | null {
  if (value === null) {
    return null;
  }
  return value as JsonValue;
}

export function createPrismaAuditStore(db: { auditLog: AuditDelegate }): AuditStore {
  return {
    async insert(entry) {
      const row = await db.auditLog.create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          before: toJson(entry.before),
          after: toJson(entry.after),
          createdAt: entry.createdAt,
        },
      });
      return {
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        before: fromJson(row.before),
        after: fromJson(row.after),
        createdAt: row.createdAt,
      };
    },
  };
}

/** Registra una acción relevante. Sin store explícito, escribe en `AuditLog`. */
export async function recordAudit(input: AuditInput, store?: AuditStore): Promise<AuditEntry> {
  const target = store ?? createPrismaAuditStore(getPrisma());
  return target.insert({
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    before: input.before ?? null,
    after: input.after ?? null,
    createdAt: new Date(),
  });
}

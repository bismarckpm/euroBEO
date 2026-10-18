import type { Prisma } from "@prisma/client";
import { compareSnapshots, type SnapshotField } from "../core/history/compare";
import {
  eventListStatus,
  formatHistoryDate,
  HISTORY_PAGE_SIZE,
  searchDateIso,
} from "../core/history/search";
import { z } from "zod";
import { getPrisma } from "./db";
import { ReviewError } from "./event-review";

const snapshotSchema = z.array(z.object({ key: z.string(), value: z.string().nullable() }));

export type ListedEvent = {
  id: string;
  title: string;
  company: string;
  locator: string;
  status: "en revisión" | "generado";
  dates: string;
};

function parseSnapshot(value: Prisma.JsonValue | null): SnapshotField[] | null {
  const parsed = snapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Lista paginada de eventos, filtrada por cliente, evento, localizador o fecha. */
export async function listEvents(query: {
  text?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ events: ListedEvent[]; page: number; pages: number; total: number }> {
  const pageSize = query.pageSize ?? HISTORY_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const text = query.text?.trim() ?? "";
  const dateText = query.date?.trim() ?? "";
  const iso = dateText ? searchDateIso(dateText) : null;
  if (dateText && !iso) {
    return { events: [], page: 1, pages: 1, total: 0 };
  }

  const filters: Prisma.EventWhereInput[] = [];
  if (text) {
    filters.push({
      OR: [
        { company: { contains: text, mode: "insensitive" } },
        { title: { contains: text, mode: "insensitive" } },
        { locator: { contains: text, mode: "insensitive" } },
      ],
    });
  }
  if (iso) {
    filters.push({
      OR: [
        { beos: { some: { date: iso } } },
        { budgets: { some: { days: { some: { dates: { has: iso } } } } } },
      ],
    });
  }
  const where: Prisma.EventWhereInput = filters.length > 0 ? { AND: filters } : {};
  const prisma = getPrisma();
  const total = await prisma.event.count({ where });
  const rows = await prisma.event.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { beos: { select: { status: true, date: true } } },
  });

  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    events: rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      locator: row.locator,
      status: eventListStatus(row.beos.map((beo) => beo.status)),
      dates: [...new Set(row.beos.map((beo) => beo.date))].sort().map(formatHistoryDate).join(", "),
    })),
  };
}

/** Compara el snapshot de un documento con el de la versión anterior. */
export async function compareDocumentVersions(
  eventId: string,
  documentId: string,
): Promise<{
  changes: { key: string; before: string | null; after: string | null }[];
  message: string | null;
}> {
  const prisma = getPrisma();
  const current = await prisma.generatedDocument.findFirst({ where: { id: documentId, eventId } });
  if (!current) {
    throw new ReviewError("No se encontró el documento.", 404);
  }
  const previous = await prisma.generatedDocument.findFirst({
    where: {
      eventId,
      kind: current.kind,
      beoId: current.beoId,
      memoId: current.memoId,
      version: { lt: current.version },
    },
    orderBy: { version: "desc" },
  });
  if (!previous) {
    return { changes: [], message: "No hay una versión anterior." };
  }
  const before = parseSnapshot(previous.snapshot);
  const after = parseSnapshot(current.snapshot);
  if (!before || !after) {
    return { changes: [], message: "No hay datos guardados para comparar." };
  }
  return { changes: compareSnapshots(before, after), message: null };
}

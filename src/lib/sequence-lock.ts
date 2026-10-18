import { getPrisma } from "./db";
import type { SequenceState } from "../core/config/sequence";

export const BEO_SEQUENCE_KEY = "beo";

export interface SequenceLock {
  read(key: string): Promise<SequenceState | null>;
  /** Incrementa bajo exclusión. Devuelve el valor ya consumido. */
  increment(key: string): Promise<SequenceState>;
}

type SequenceRow = {
  lastNumber: number;
  year: number;
};

export function prismaSequenceLock(): SequenceLock {
  const prisma = getPrisma();
  return {
    async read(key) {
      const row = await prisma.sequence.findUnique({ where: { key } });
      return row ? { lastNumber: row.lastNumber, year: row.year } : null;
    },
    async increment(key) {
      return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<SequenceRow[]>`
          SELECT "lastNumber", "year"
          FROM "Sequence"
          WHERE "key" = ${key}
          FOR UPDATE
        `;
        const current = rows[0];
        if (!current) {
          throw new Error("No hay correlativo configurado.");
        }
        const next = { lastNumber: current.lastNumber + 1, year: current.year };
        await tx.sequence.update({
          where: { key },
          data: { lastNumber: next.lastNumber },
        });
        return next;
      });
    },
  };
}

/** Bloqueo en memoria para probar que dos asignaciones no obtienen el mismo número. */
export function createMemorySequenceLock(initial: SequenceState): SequenceLock {
  let row: SequenceState = { ...initial };
  let tail: Promise<void> = Promise.resolve();

  return {
    async read() {
      return { ...row };
    },
    async increment() {
      const run = tail.then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        row = { lastNumber: row.lastNumber + 1, year: row.year };
        return { ...row };
      });
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

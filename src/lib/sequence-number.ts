import { formatBeoNumber, type SequenceState } from "../core/config/sequence";
import { BEO_SEQUENCE_KEY, prismaSequenceLock, type SequenceLock } from "./sequence-lock";

export async function peekNextNumber(lock: SequenceLock = prismaSequenceLock()): Promise<{
  last: SequenceState;
  next: string;
}> {
  const last = await lock.read(BEO_SEQUENCE_KEY);
  if (!last) {
    throw new Error("No hay correlativo configurado.");
  }
  return { last, next: formatBeoNumber(last.lastNumber + 1, last.year) };
}

export async function assignNextNumber(
  lock: SequenceLock = prismaSequenceLock(),
  key = BEO_SEQUENCE_KEY,
): Promise<string> {
  const next = await lock.increment(key);
  return formatBeoNumber(next.lastNumber, next.year);
}

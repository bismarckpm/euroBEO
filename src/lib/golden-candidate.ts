import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type GoldenCandidate = {
  eventId: string;
  referenceName: string;
  savedAt: string;
};

function directory(eventId: string): string {
  return path.join(process.cwd(), "data", "golden-candidates", eventId);
}

export async function readGoldenCandidate(eventId: string): Promise<GoldenCandidate | null> {
  try {
    const raw = await readFile(path.join(directory(eventId), "meta.json"), "utf8");
    const parsed = JSON.parse(raw) as GoldenCandidate;
    return parsed.eventId === eventId ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveGoldenCandidate(input: {
  eventId: string;
  referenceName: string;
  reference: Buffer;
  budgetPdf: Buffer | null;
}): Promise<GoldenCandidate> {
  const dir = directory(input.eventId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, input.referenceName), input.reference);
  if (input.budgetPdf) {
    await writeFile(path.join(dir, "presupuesto.pdf"), input.budgetPdf);
  }
  const meta: GoldenCandidate = {
    eventId: input.eventId,
    referenceName: input.referenceName,
    savedAt: new Date().toISOString(),
  };
  await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  return meta;
}

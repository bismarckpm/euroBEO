import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadBudgetCatalog } from "../../../../../lib/budget-catalog";
import { readBudgetPdf } from "../../../../../lib/budget-ingest";
import { saveBudget } from "../../../../../lib/budget-store";
import { getPrisma } from "../../../../../lib/db";
import { readGoldenCandidate } from "../../../../../lib/golden-candidate";
import { POST } from "./route";

const budgets = path.join(process.cwd(), "fixtures", "presupuestos");

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

const ready = existsSync(budgets) && ensureDatabaseUrl();
const created: { budgetId: string; eventId: string }[] = [];

describe.skipIf(!ready)("POST /api/events/:id/golden", () => {
  afterAll(async () => {
    if (!ready) {
      return;
    }
    const prisma = getPrisma();
    for (const row of created) {
      await rm(path.join(process.cwd(), "data", "golden-candidates", row.eventId), {
        recursive: true,
        force: true,
      });
      await prisma.beo.deleteMany({ where: { eventId: row.eventId, status: "draft" } });
      await prisma.budget.delete({ where: { id: row.budgetId } }).catch(() => undefined);
      const remaining = await prisma.budget.count({ where: { eventId: row.eventId } });
      if (remaining === 0) {
        await prisma.event.delete({ where: { id: row.eventId } }).catch(() => undefined);
      }
    }
    await prisma.$disconnect();
  });

  it("guarda la B.E.O. corregida y el presupuesto como caso dorado candidato", async () => {
    const name = readdirSync(budgets).find((file) => file.includes("Evento 3") && file.endsWith(".pdf"));
    if (!name) {
      throw new Error("No está el presupuesto de Reumatología.");
    }
    const pdf = new Uint8Array(readFileSync(path.join(budgets, name)));
    const parsed = await readBudgetPdf(pdf, await loadBudgetCatalog());
    parsed.client.company = `Candidato ${randomUUID()}`;
    parsed.header.locator = randomUUID();
    const saved = await saveBudget({
      budget: parsed,
      pdf,
      fileName: name,
      newVersion: true,
      justification: null,
    });
    created.push({ budgetId: saved.id, eventId: saved.eventId });

    const form = new FormData();
    form.set("referencia", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "beo-corregida.pdf", { type: "application/pdf" }));
    const response = await POST(new Request("http://localhost/api/events/test/golden", { method: "POST", body: form }), {
      params: Promise.resolve({ id: saved.eventId }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { message: string };
    expect(body.message).toContain("caso dorado candidato");

    const candidate = await readGoldenCandidate(saved.eventId);
    expect(candidate?.referenceName).toBe("beo-asistente.pdf");
    expect(existsSync(path.join(process.cwd(), "data", "golden-candidates", saved.eventId, "presupuesto.pdf"))).toBe(
      true,
    );
  });
});

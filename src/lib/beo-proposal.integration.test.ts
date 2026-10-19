import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { POST } from "../app/api/events/[id]/beo-proposal/route";
import { getPrisma } from "./db";
import { saveBudget } from "./budget-store";
import { loadBudgetCatalog } from "./budget-catalog";
import { readBudgetPdf } from "./budget-ingest";

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
const createdBudgetIds: string[] = [];

describe.skipIf(!ready)("POST /api/events/:id/beo-proposal", () => {
  afterAll(async () => {
    if (!ready) {
      return;
    }
    const prisma = getPrisma();
    for (const budgetId of createdBudgetIds) {
      const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
      if (!budget) {
        continue;
      }
      await prisma.beo.deleteMany({ where: { eventId: budget.eventId, status: "draft" } });
      await prisma.budget.delete({ where: { id: budgetId } });
      const remaining = await prisma.budget.count({ where: { eventId: budget.eventId } });
      if (remaining === 0) {
        await prisma.event.delete({ where: { id: budget.eventId } });
      }
    }
    await prisma.$disconnect();
  });

  it("guarda 6 borradores para el presupuesto de Reumatología", async () => {
    const name = readdirSync(budgets).find((file) => file.includes("Evento 3"));
    if (!name) {
      throw new Error("No está el presupuesto de Reumatología.");
    }
    const pdf = new Uint8Array(readFileSync(path.join(budgets, name)));
    const parsed = await readBudgetPdf(pdf, await loadBudgetCatalog());
    const saved = await saveBudget({
      budget: parsed,
      pdf,
      fileName: name,
      newVersion: true,
      justification: null,
    });
    createdBudgetIds.push(saved.id);

    const response = await POST(new Request("http://localhost/api/events/test/beo-proposal"), {
      params: Promise.resolve({ id: saved.eventId }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      proposals: { status: string; salon: string; date: string }[];
    };
    expect(body.proposals).toHaveLength(6);
    expect(body.proposals.every((proposal) => proposal.status === "draft")).toBe(true);

    const stored = await getPrisma().beo.findMany({
      where: { eventId: saved.eventId, status: "draft" },
      include: { fields: true, lines: true },
    });
    expect(stored).toHaveLength(6);
    expect(stored.every((beo) => beo.fields.length > 0)).toBe(true);
  });
});

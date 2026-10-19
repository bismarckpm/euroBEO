import { Prisma } from "@prisma/client";
import {
  emptyClient,
  emptyHeader,
  tracked,
  type FieldStatus,
  type ParsedBudget,
} from "../core/budget/model";
import { normalizeLabel } from "../core/config/normalize";
import { BEO_SECTIONS, isBeoSection } from "../core/config/sections";
import { normalizeBudget } from "../core/normalization/orchestrate";
import {
  isNormalizationTask,
  validateBlockFields,
  validateItemSection,
  validateTrigger,
  type ClosedCatalog,
  type NormalizationTask,
} from "../core/normalization/schemas";
import { listMemos, listSalons } from "./catalog-db";
import { getPrisma } from "./db";
import { parseEnv } from "./env";
import { createOpenAIProvider } from "./openai-normalization";

export class NormalizationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizationInputError";
  }
}

async function closedCatalog(): Promise<ClosedCatalog> {
  const [salons, memos] = await Promise.all([listSalons(), listMemos()]);
  return {
    salons: salons.map((salon) => salon.name),
    sections: BEO_SECTIONS,
    memoTypes: memos.map((memo) => memo.name),
    keywords: memos.flatMap((memo) => memo.keywords.map((keyword) => normalizeLabel(keyword))),
  };
}

function storedResult(
  task: NormalizationTask,
  raw: string,
  catalog: ClosedCatalog,
): Prisma.InputJsonValue | null {
  if (task === "block_fields") {
    const fields = validateBlockFields({ salonCandidates: [raw] }, catalog);
    return fields?.salon ? { salon: fields.salon } : null;
  }
  if (task === "item_section") {
    const target = isBeoSection(raw) ? validateItemSection({ target: raw }, catalog) : null;
    return target ? { target } : null;
  }
  const memo = validateTrigger({ memoTypeKey: raw }, catalog);
  return memo ? { memoTypeKey: memo } : null;
}

async function runNormalization(budget: ParsedBudget, onCall?: () => void): Promise<ParsedBudget> {
  const env = parseEnv(process.env);
  const catalog = await closedCatalog();
  const rows = await getPrisma().learnedNormalization.findMany({ where: { active: true } });
  const learned = new Map(rows.map((row) => [`${row.task}\n${row.normalizedText}`, row.result]));
  const provider = env.OPENAI_API_KEY
    ? createOpenAIProvider({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        timeoutMs: env.OPENAI_TIMEOUT_MS,
      })
    : null;

  return normalizeBudget(budget, {
    catalog,
    provider,
    findLearned: async (task, source) => {
      const hit = learned.get(`${task}\n${normalizeLabel(source)}`);
      return hit === undefined ? null : hit;
    },
    recordCall: async (record) => {
      onCall?.();
      await getPrisma().aiCallLog.create({
        data: {
          task: record.task,
          fragment: record.fragment,
          response:
            record.response === null || record.response === undefined
              ? Prisma.JsonNull
              : (record.response as Prisma.InputJsonValue),
          valid: record.valid,
        },
      });
    },
  });
}

export async function normalizeStoredBudget(budget: ParsedBudget): Promise<ParsedBudget> {
  return runNormalization(budget);
}

export async function saveLearnedNormalization(input: {
  task: string;
  sourceText: string;
  result: string;
}): Promise<void> {
  if (!isNormalizationTask(input.task)) {
    throw new NormalizationInputError("La tarea no es válida.");
  }
  const sourceText = input.sourceText.trim();
  if (sourceText.length < 2) {
    throw new NormalizationInputError("Escribe el texto original.");
  }
  const result = storedResult(input.task, input.result.trim(), await closedCatalog());
  if (!result) {
    throw new NormalizationInputError("El resultado no pertenece al catálogo.");
  }
  const normalizedText = normalizeLabel(sourceText);
  await getPrisma().learnedNormalization.upsert({
    where: { task_normalizedText: { task: input.task, normalizedText } },
    create: { task: input.task, normalizedText, sourceText, result, active: true },
    update: { sourceText, result, active: true },
  });
}

export async function updateLearnedNormalization(id: string, result: string): Promise<void> {
  const row = await getPrisma().learnedNormalization.findUnique({ where: { id } });
  if (!row || !isNormalizationTask(row.task)) {
    throw new NormalizationInputError("No se encontró la normalización.");
  }
  const stored = storedResult(row.task, result.trim(), await closedCatalog());
  if (!stored) {
    throw new NormalizationInputError("El resultado no pertenece al catálogo.");
  }
  await getPrisma().learnedNormalization.update({
    where: { id },
    data: { result: stored, active: true },
  });
}

export async function deactivateLearnedNormalization(id: string): Promise<void> {
  await getPrisma().learnedNormalization.update({ where: { id }, data: { active: false } });
}

export async function listLearnedNormalizations() {
  return getPrisma().learnedNormalization.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function listAiCallLogs() {
  return getPrisma().aiCallLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
}

export async function probeSalonText(sourceText: string): Promise<{
  salon: string | null;
  status: FieldStatus;
  calls: number;
}> {
  let calls = 0;
  const budget: ParsedBudget = {
    header: emptyHeader(),
    client: emptyClient(),
    eventTitle: null,
    days: [
      {
        dates: [],
        raw: "",
        blocks: [
          {
            kind: "EVENTO",
            rawTitle: "",
            salonRaw: sourceText,
            salon: tracked(null, "PENDING"),
            schedule: tracked(null, "PENDING"),
            setup: tracked(null, "PENDING"),
            pax: tracked(null, "PENDING"),
            nights: null,
            rent: { regular: null, net: null, discountLabel: null, courtesy: false },
            sections: [],
            page: 1,
          },
        ],
      },
    ],
    totals: {
      subtotal: null,
      iva: null,
      logistics: null,
      general: null,
      igtf: null,
      payable: null,
    },
    benefits: [],
    triggers: [],
    warnings: [],
    structureErrors: [],
    reconciliation: { expected: null, actual: 0, difference: null, lines: [], ok: false },
  };
  const normalized = await runNormalization(budget, () => {
    calls += 1;
  });
  const salon = normalized.days[0]?.blocks[0]?.salon;
  return { salon: salon?.value ?? null, status: salon?.status ?? "PENDING", calls };
}

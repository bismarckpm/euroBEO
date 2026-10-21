import { classifyItem } from "../beo/classify";
import { tracked, type FieldStatus, type ParsedBudget } from "../budget/model";
import { normalizeLabel } from "../config/normalize";
import { maskFragment, type ClientMaskData } from "./mask";
import type { NormalizationProvider } from "./provider";
import {
  validateBlockFields,
  validateItemSection,
  validateTrigger,
  type BlockFieldsResult,
  type ClosedCatalog,
  type NormalizationTask,
} from "./schemas";

export type AiCallRecord = {
  task: NormalizationTask;
  fragment: string;
  response: unknown;
  valid: boolean;
};

export type NormalizeDeps = {
  catalog: ClosedCatalog;
  findLearned: (task: NormalizationTask, sourceText: string) => Promise<unknown | null>;
  provider: NormalizationProvider | null;
  recordCall?: (record: AiCallRecord) => Promise<void>;
};

function usable(text: string | null | undefined): string | null {
  const value = text?.trim() ?? "";
  if (!value || /por definir|^\.\.\.$|^…$/i.test(value)) {
    return null;
  }
  return value;
}

function clientOf(budget: ParsedBudget): ClientMaskData {
  return {
    company: budget.client.company,
    contact: budget.client.contact,
    phones: [budget.client.phones, budget.header.phone].filter(Boolean).join(" / "),
    address: budget.client.address,
    email: [budget.client.email, budget.header.email].filter(Boolean).join(" / "),
    rif: budget.client.rif,
  };
}

function blockPayload(payload: unknown): unknown {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("salon" in payload) ||
    "salonCandidates" in payload
  ) {
    return payload;
  }
  const salon = payload.salon;
  return {
    ...payload,
    salonCandidates: typeof salon === "string" ? [salon] : [],
  };
}

async function callProvider(
  deps: NormalizeDeps,
  task: NormalizationTask,
  source: string,
  budget: ParsedBudget,
): Promise<{ payload: unknown | null; called: boolean }> {
  if (!deps.provider) {
    return { payload: null, called: false };
  }
  const fragment = maskFragment(source, clientOf(budget)).slice(0, 2000);
  try {
    const response = await deps.provider.complete({ task, fragment, catalog: deps.catalog });
    return { payload: response, called: true };
  } catch {
    await deps.recordCall?.({ task, fragment, response: null, valid: false });
    return { payload: null, called: true };
  }
}

function statusFor(called: boolean): FieldStatus {
  return called ? "AI" : "RULE";
}

function keywordHit(text: string, catalog: ClosedCatalog): boolean {
  const label = normalizeLabel(text);
  return catalog.keywords.some((keyword) => keyword.length > 0 && label.includes(keyword));
}

async function learnedBlock(
  deps: NormalizeDeps,
  source: string | null,
): Promise<BlockFieldsResult | null> {
  if (!source) {
    return null;
  }
  const stored = await deps.findLearned("block_fields", source);
  if (stored === null) {
    return null;
  }
  return validateBlockFields(blockPayload(stored), deps.catalog);
}

/** Resuelve campos pendientes: normalización aprendida, luego IA, y si no, siguen pendientes. */
export async function normalizeBudget(
  budget: ParsedBudget,
  deps: NormalizeDeps,
): Promise<ParsedBudget> {
  const next = structuredClone(budget);

  for (const day of next.days) {
    for (const block of day.blocks) {
      const salonText = block.salon.status === "PENDING" ? usable(block.salonRaw) : null;
      const scheduleText =
        block.schedule.status === "PENDING" ? usable(block.schedule.value) : null;
      const setupText = block.setup.status === "PENDING" ? usable(block.setup.value) : null;

      const salonLearned = await learnedBlock(deps, salonText);
      if (salonText && salonLearned?.salon) {
        block.salon = tracked(salonLearned.salon, "RULE");
      }
      const scheduleLearned = await learnedBlock(deps, scheduleText);
      if (scheduleText && scheduleLearned?.scheduleStart && scheduleLearned.scheduleEnd) {
        block.schedule = tracked(
          `${scheduleLearned.scheduleStart} a ${scheduleLearned.scheduleEnd}`,
          "RULE",
        );
      }
      const setupLearned = await learnedBlock(deps, setupText);
      if (setupText && setupLearned?.setupType) {
        block.setup = tracked(setupLearned.setupType, "RULE");
      }

      const pending = [
        block.salon.status === "PENDING" ? salonText : null,
        block.schedule.status === "PENDING" ? scheduleText : null,
        block.setup.status === "PENDING" ? setupText : null,
      ].filter((part): part is string => part !== null);

      if (pending.length > 0) {
        const asked = await callProvider(deps, "block_fields", pending.join("\n"), next);
        const fields = asked.payload
          ? validateBlockFields(blockPayload(asked.payload), deps.catalog)
          : null;
        const accepted = Boolean(
          (salonText && block.salon.status === "PENDING" && fields?.salon) ||
          (scheduleText &&
            block.schedule.status === "PENDING" &&
            fields?.scheduleStart &&
            fields.scheduleEnd) ||
          (setupText && block.setup.status === "PENDING" && fields?.setupType),
        );
        if (asked.called && asked.payload !== null) {
          const fragment = maskFragment(pending.join("\n"), clientOf(next)).slice(0, 2000);
          await deps.recordCall?.({
            task: "block_fields",
            fragment,
            response: asked.payload,
            valid: accepted,
          });
        }
        if (fields && asked.called) {
          const status = statusFor(true);
          if (salonText && block.salon.status === "PENDING" && fields.salon) {
            block.salon = tracked(fields.salon, status);
          }
          if (
            scheduleText &&
            block.schedule.status === "PENDING" &&
            fields.scheduleStart &&
            fields.scheduleEnd
          ) {
            block.schedule = tracked(`${fields.scheduleStart} a ${fields.scheduleEnd}`, status);
          }
          if (setupText && block.setup.status === "PENDING" && fields.setupType) {
            block.setup = tracked(fields.setupType, status);
          }
          if (
            block.pax.status === "PENDING" &&
            fields.pax &&
            /pax|personas|capacidad/i.test(pending.join(" "))
          ) {
            block.pax = tracked(fields.pax, status);
          }
        }
      }

      for (const section of block.sections) {
        if (section.target.status === "PENDING") {
          const header = usable(section.headerRaw);
          if (header) {
            await applySection(deps, next, header, (target, status) => {
              section.target = tracked(target, status);
            });
          }
        }
        for (const item of section.items) {
          if (item.section.status !== "PENDING") {
            continue;
          }
          const description = usable(item.description.split("\n")[0] ?? "");
          if (!description) {
            continue;
          }
          const headerSection = section.target.status === "AI" ? null : section.target.value;
          const fallback = classifyItem({
            description: item.description,
            catalogSection: null,
            headerSection,
            aiSection: null,
          });
          if (fallback.section) {
            continue;
          }
          await applySection(
            deps,
            next,
            `${section.headerRaw}\n${description}`,
            (target, status) => {
              item.section = tracked(target, status);
            },
          );
        }
      }
    }
  }

  for (const benefit of next.benefits) {
    if (keywordHit(benefit, deps.catalog)) {
      continue;
    }
    const stored = await deps.findLearned("trigger_clause", benefit);
    if (stored !== null) {
      const memo = validateTrigger(stored, deps.catalog);
      const cleared =
        typeof stored === "object" &&
        stored !== null &&
        "memoTypeKey" in stored &&
        stored.memoTypeKey === null;
      if (cleared) {
        continue;
      }
      if (memo) {
        if (!next.triggers.includes(memo)) {
          next.triggers.push(memo);
        }
        continue;
      }
    }
    const asked = await callProvider(deps, "trigger_clause", benefit, next);
    if (!asked.called || asked.payload === null) {
      continue;
    }
    const memo = validateTrigger(asked.payload, deps.catalog);
    const fragment = maskFragment(benefit, clientOf(next)).slice(0, 2000);
    await deps.recordCall?.({
      task: "trigger_clause",
      fragment,
      response: asked.payload,
      valid: memo !== null,
    });
    if (memo && !next.triggers.includes(memo)) {
      next.triggers.push(memo);
    }
  }

  return next;
}

async function applySection(
  deps: NormalizeDeps,
  budget: ParsedBudget,
  source: string,
  assign: (target: string, status: FieldStatus) => void,
): Promise<void> {
  const stored = await deps.findLearned("item_section", source);
  if (stored !== null) {
    const target = validateItemSection(stored, deps.catalog);
    if (target) {
      assign(target, "RULE");
      return;
    }
  }
  const asked = await callProvider(deps, "item_section", source, budget);
  if (!asked.called || asked.payload === null) {
    return;
  }
  const target = validateItemSection(asked.payload, deps.catalog);
  const fragment = maskFragment(source, clientOf(budget)).slice(0, 2000);
  await deps.recordCall?.({
    task: "item_section",
    fragment,
    response: asked.payload,
    valid: target !== null,
  });
  if (target) {
    assign(target, "AI");
  }
}

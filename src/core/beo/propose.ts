import { isEmptyMarker, placeKey } from "../budget/field-status";
import type { BudgetBlock, BudgetItem, BudgetSection, FieldStatus, ParsedBudget } from "../budget/model";
import type { FixedTexts } from "../config/fixed-texts";
import { assignPersonnel, classifyItem, eventColumn } from "./classify";
import { foodSummary, structureFood } from "./food";
import { displaySalon, formatBeoDate, personnelLine, spanishWeekday, splitCents } from "./format";
import type { BeoDraft, BeoField, BeoFieldStatus, BeoKind, BeoLine } from "./model";
import { defaultBeoSettings, type BeoSettings } from "./presentation";

type Slice = {
  date: string;
  block: BudgetBlock;
  rentCents: number | null;
  salon: string;
  needsReview: boolean;
};

const RIGHT_SECTIONS = [
  "ACCESOS",
  "BEBIDAS",
  "DESCORCHE",
  "SISTEMAS",
  "MOBILIARIO",
  "ELECTRICIDAD",
  "PERSONAL",
  "PENDIENTE",
] as const;

const PERSONNEL_GROUPS = ["Montaje", "Evento", "Desmontaje"] as const;

function field<T>(value: T, status: BeoFieldStatus, source: string): BeoField<T> {
  return { value, status, source };
}

function clientField(value: string | null, source: string, origin?: string): BeoField<string | null> {
  if (origin === "scan") {
    return field(value, "VALIDATE", source);
  }
  if (!value || isEmptyMarker(value)) {
    return field(null, "ABSENT", source);
  }
  return field(value, "RULE", source);
}

function inherited(status: FieldStatus): BeoFieldStatus {
  return status;
}

function isSharedTeardown(block: BudgetBlock): boolean {
  if (block.kind !== "DESMONTAJE") {
    return false;
  }
  const raw = (block.salonRaw ?? "").trim();
  if (/\b(ambos|todos)\b/i.test(raw)) {
    return true;
  }
  return block.salon.value === null && (block.salon.status === "ABSENT" || block.salon.status === "PENDING");
}

function ownSalon(block: BudgetBlock): string {
  const name = (block.salon.value ?? block.salonRaw ?? "").trim();
  if (!name || block.salon.status === "ABSENT") {
    return "";
  }
  return displaySalon(name);
}

function expand(budget: ParsedBudget): Slice[] {
  const slices: Slice[] = [];
  for (const day of budget.days) {
    if (day.dates.length === 0) {
      continue;
    }
    for (const block of day.blocks) {
      const courtesy = block.rent.courtesy || block.rent.net === null;
      const shares = courtesy ? day.dates.map(() => null) : splitCents(block.rent.net ?? 0, day.dates.length);
      day.dates.forEach((date, index) => {
        slices.push({
          date,
          block,
          rentCents: shares[index] ?? null,
          salon: ownSalon(block),
          needsReview: false,
        });
      });
    }
  }
  return assignSharedTeardown(slices);
}

function assignSharedTeardown(slices: Slice[]): Slice[] {
  const lastSalon = new Map<string, string>();
  for (const slice of slices) {
    if (!isSharedTeardown(slice.block)) {
      lastSalon.set(slice.date, slice.salon);
    }
  }
  return slices.map((slice) => {
    if (!isSharedTeardown(slice.block)) {
      return slice;
    }
    const salon = lastSalon.get(slice.date) ?? slice.salon;
    return { ...slice, salon, needsReview: true };
  });
}

function kindOf(blocks: BudgetBlock[]): BeoKind {
  const kinds = new Set(blocks.map((block) => block.kind));
  if (kinds.has("EVENTO") || kinds.has("OTRO")) {
    return "EVENTO";
  }
  if (kinds.has("MONTAJE") && kinds.has("DESMONTAJE")) {
    return "EVENTO";
  }
  if (kinds.has("DESMONTAJE")) {
    return "DESMONTAJE";
  }
  return "MONTAJE";
}

function formatRowDate(iso: string, settings: BeoSettings): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return formatBeoDate(iso);
  }
  if (settings.presentation.dateFormat === "dd/mm/yy") {
    return `${match[3]}/${match[2]}/${match[1].slice(2)}`;
  }
  return formatBeoDate(iso);
}

function firstText(
  slices: Slice[],
  read: (block: BudgetBlock) => { value: string | null; status: FieldStatus },
): BeoField<string | null> {
  let pending = false;
  for (const slice of slices) {
    const current = read(slice.block);
    if (current.value && !isEmptyMarker(current.value)) {
      return field(current.value, inherited(current.status), "budget.block");
    }
    if (current.status === "PENDING") {
      pending = true;
    }
  }
  return field(null, pending ? "PENDING" : "ABSENT", "budget.block");
}

function guaranteeOf(slices: Slice[]): BeoField<number | null> {
  const preferred = slices.filter((slice) => slice.block.kind === "EVENTO");
  const pool = preferred.length > 0 ? preferred : slices;
  for (const slice of pool) {
    if (slice.block.pax.value !== null) {
      return field(slice.block.pax.value, inherited(slice.block.pax.status), "budget.pax");
    }
  }
  const pending = pool.some((slice) => slice.block.pax.status === "PENDING");
  return field(null, pending ? "PENDING" : "ABSENT", "budget.pax");
}

function rentOf(slices: Slice[]): BeoField<number | null> {
  const amounts = slices
    .map((slice) => slice.rentCents)
    .filter((amount): amount is number => amount !== null);
  if (amounts.length === 0) {
    return field(null, "RULE", "rule:rn-19");
  }
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const split = slices.some((slice) => slice.block.rent.net !== null && (slice.block.rent.net ?? 0) !== slice.rentCents);
  return field(total, "RULE", split ? "rule:rn-16" : "budget.rent");
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function ruledSection(value: string | null, status: FieldStatus): string | null {
  return status === "AI" ? null : value;
}

function resolveSection(item: BudgetItem, section: BudgetSection): { section: string | null; review: boolean } {
  const catalog = ruledSection(item.section.value, item.section.status);
  const header = ruledSection(section.target.value, section.target.status);
  if (catalog === "EXCLUIR" || header === "EXCLUIR") {
    return { section: null, review: false };
  }
  const aiSection =
    (item.section.status === "AI" ? item.section.value : null) ??
    (section.target.status === "AI" ? section.target.value : null);
  const classified = classifyItem({
    description: item.description,
    catalogSection: catalog,
    headerSection: header,
    aiSection,
  });
  if (classified.section) {
    return classified;
  }
  const haystack = `${section.headerRaw} ${item.description}`.toLowerCase();
  if (haystack.includes("internet") || haystack.includes("sistema")) return { section: "SISTEMAS", review: false };
  if (haystack.includes("personal")) return { section: "PERSONAL", review: false };
  if (haystack.includes("alimento")) return { section: "ALIMENTOS", review: false };
  if (haystack.includes("bebida")) return { section: "BEBIDAS", review: false };
  if (haystack.includes("acceso")) return { section: "ACCESOS", review: false };
  if (haystack.includes("mobiliario")) return { section: "MOBILIARIO", review: false };
  if (haystack.includes("electric")) return { section: "ELECTRICIDAD", review: false };
  return { section: null, review: true };
}

function lineStatus(item: BudgetItem, section: BudgetSection): BeoFieldStatus {
  if (item.section.value) {
    return inherited(item.section.status);
  }
  if (section.target.value) {
    return inherited(section.target.status);
  }
  return "PENDING";
}

function unitPrice(item: BudgetItem): number | null {
  if (item.unitPrice !== null) {
    return item.unitPrice;
  }
  if (item.total !== null && item.qty > 0) {
    return Math.round(item.total / item.qty);
  }
  return null;
}

function scanLineStatus(status: BeoFieldStatus, item: BudgetItem, origin?: string): BeoFieldStatus {
  if (origin !== "scan" || item.flags.includes("verified")) {
    return status;
  }
  return "VALIDATE";
}

function toLine(
  item: BudgetItem,
  section: BudgetSection,
  block: BudgetBlock,
  resolved: string,
  review: boolean,
  settings: BeoSettings,
  origin?: string,
): BeoLine {
  const price = unitPrice(item);
  const description = resolved === "ALIMENTOS" ? item.description.trim() : oneLine(item.description);
  const marks = item.flags.filter((flag) => flag === "AM" || flag === "PM");
  const marked = marks.length > 0 ? `${description} ${marks.join(" ")}` : description;
  const status = scanLineStatus(review ? "REVIEW" : lineStatus(item, section), item, origin);
  if (resolved === "ALIMENTOS") {
    const food = structureFood({
      description: marked,
      qty: item.qty,
      unitPriceCents: price,
      blockPax: block.pax.value,
      setup: block.setup.value,
      tableCalculation: settings.presentation.tableCalculation,
    });
    return {
      section: resolved,
      group: "",
      qty: item.qty,
      description: marked,
      unitPriceCents: price,
      text: foodSummary(food),
      status: food.needsReview ? "REVIEW" : status,
      source: "budget.item",
    };
  }
  const personnel = resolved === "PERSONAL" ? assignPersonnel(section.headerRaw, block.kind) : null;
  const group = personnel?.group ?? "";
  const confirm = review || personnel?.review === true;
  return {
    section: resolved,
    group,
    qty: item.qty,
    description: marked,
    unitPriceCents: price,
    text: personnelLine(item.qty, marked, price),
    status: confirm || (group === "" && resolved === "PERSONAL") ? "REVIEW" : status,
    source: "budget.item",
  };
}

function collectLines(
  slices: Slice[],
  settings: BeoSettings,
  origin?: string,
): { food: BeoLine[]; sections: BeoDraft["sections"] } {
  const food: BeoLine[] = [];
  const bySection = new Map<string, BeoLine[]>();
  for (const slice of slices) {
    for (const section of slice.block.sections) {
      for (const item of section.items) {
        const resolved = resolveSection(item, section);
        if (!resolved.section) {
          const pending = toLine(item, section, slice.block, "ALIMENTOS", true, settings, origin);
          pending.section = "";
          pending.status = "PENDING";
          pending.text = oneLine(item.description);
          const bucket = bySection.get("") ?? [];
          bucket.push(pending);
          bySection.set("", bucket);
          continue;
        }
        const line = toLine(item, section, slice.block, resolved.section, resolved.review, settings, origin);
        if (resolved.section === "ALIMENTOS") {
          food.push(line);
          continue;
        }
        const bucket = bySection.get(resolved.section) ?? [];
        bucket.push(line);
        bySection.set(resolved.section, bucket);
      }
    }
  }

  const sections: BeoDraft["sections"] = [];
  const unclassified = bySection.get("") ?? [];
  if (unclassified.length > 0) {
    sections.push({ section: "", groups: [{ name: "", lines: unclassified }] });
  }
  for (const section of RIGHT_SECTIONS) {
    if (section === "PENDIENTE") {
      continue;
    }
    const lines = bySection.get(section) ?? [];
    if (lines.length === 0) {
      continue;
    }
    if (section !== "PERSONAL") {
      sections.push({ section, groups: [{ name: "", lines }] });
      continue;
    }
    const groups = PERSONNEL_GROUPS.flatMap((name) => {
      const grouped = lines.filter((line) => line.group === name);
      return grouped.length > 0 ? [{ name, lines: grouped }] : [];
    });
    sections.push({ section, groups });
  }
  return { food, sections };
}

function buildDraft(
  budget: ParsedBudget,
  slices: Slice[],
  texts: FixedTexts,
  settings: BeoSettings,
): BeoDraft {
  const blocks = slices.map((slice) => slice.block);
  const kind = kindOf(blocks);
  const salon = slices[0]?.salon ?? "";
  const date = slices[0]?.date ?? "";
  const schedulePool =
    kind === "MONTAJE"
      ? slices.filter((slice) => slice.block.kind === "MONTAJE")
      : slices.filter((slice) => slice.block.kind === "EVENTO");
  const schedule = firstText(schedulePool.length > 0 ? schedulePool : slices, (block) => block.schedule);
  const setupPool = slices.filter((slice) => slice.block.kind === "MONTAJE");
  const setup = firstText(setupPool.length > 0 ? setupPool : slices, (block) => block.setup);
  const lines = collectLines(slices, settings, budget.origin);
  const title = budget.eventTitle ?? "";
  const hasService = lines.sections.some(
    (section) =>
      section.section === "PERSONAL" &&
      section.groups.some((group) => group.name === "Evento" && group.lines.length > 0),
  );
  const weekday = spanishWeekday(date);
  const rowDate = formatRowDate(date, settings);

  return {
    date,
    salon,
    kind,
    needsReview: slices.some((slice) => slice.needsReview),
    company: clientField(budget.client.company, "budget.client.company", budget.origin),
    contact: clientField(budget.client.contact, "budget.client.contact", budget.origin),
    phone: clientField(budget.client.phones, "budget.client.phone", budget.origin),
    address: clientField(budget.client.address, "budget.client.address", budget.origin),
    weekday: field(
      settings.presentation.uppercaseDayAndContact ? weekday.toUpperCase() : weekday,
      "RULE",
      "rule:date",
    ),
    formattedDate: field(rowDate, "RULE", "rule:date"),
    schedule,
    eventType: field(
      eventColumn({
        title,
        kind,
        hasFood: lines.food.length > 0,
        hasServiceStaff: hasService,
        types: settings.eventTypes,
      }),
      "RULE",
      "rule:event-type",
    ),
    salonName: field(
      salon,
      slices.some((slice) => slice.needsReview) ? "REVIEW" : inherited(blocks[0]?.salon.status ?? "ABSENT"),
      "budget.salon",
    ),
    guarantee: guaranteeOf(slices),
    rentCents: rentOf(slices),
    billboard: field(
      budget.eventTitle,
      budget.eventTitle && !isEmptyMarker(budget.eventTitle) ? "RULE" : "ABSENT",
      "budget.event-title",
    ),
    setup,
    specialInstructions: field(texts.specialInstructions, "RULE", "config.special-instructions"),
    servicePreparation: field(texts.servicePreparation, "RULE", "config.service-preparation"),
    food: lines.food,
    sections: lines.sections,
  };
}

/** Propone una B.E.O. por fecha y salón a partir del presupuesto ya leído. */
export function proposeBeos(
  budget: ParsedBudget,
  texts: FixedTexts,
  settings: BeoSettings = defaultBeoSettings,
): BeoDraft[] {
  const groups = new Map<string, Slice[]>();
  for (const slice of expand(budget)) {
    const key = `${slice.date}\u0000${placeKey(slice.salon)}`;
    const group = groups.get(key) ?? [];
    group.push(slice);
    groups.set(key, group);
  }
  return [...groups.values()].map((slices) => buildDraft(budget, slices, texts, settings));
}

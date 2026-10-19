import type { BudgetBlock, BudgetItem, BudgetSection, FieldStatus, ParsedBudget } from "../budget/model";
import type { FixedTexts } from "../config/fixed-texts";
import { displaySalon, formatBeoDate, formatCents, personnelLine, spanishWeekday, splitCents } from "./format";
import type { BeoDraft, BeoField, BeoFieldStatus, BeoKind, BeoLine } from "./model";

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

function clientField(value: string | null, source: string): BeoField<string | null> {
  return field(value, value ? "RULE" : "PENDING", source);
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
  return block.salon.status === "PENDING" && (raw.includes(" - ") || block.salon.value === null);
}

function ownSalon(block: BudgetBlock): string {
  const name = block.salon.value ?? (block.salonRaw ?? "").trim();
  return displaySalon(name || "Por definir");
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

function eventLabel(title: string, kind: BeoKind): string {
  if (kind === "MONTAJE") {
    return "Montaje";
  }
  if (kind === "DESMONTAJE") {
    return "Desmontaje";
  }
  const upper = title.toUpperCase();
  if (upper.includes("CONGRESO")) return "Congreso";
  if (upper.includes("CENA")) return "Cena";
  if (upper.includes("ALMUERZO")) return "Almuerzo";
  if (upper.includes("REUNI")) return "Reunión";
  if (upper.includes("CÓCTEL") || upper.includes("COCTEL")) return "Cóctel";
  return "Evento";
}

function firstText(
  slices: Slice[],
  read: (block: BudgetBlock) => { value: string | null; status: FieldStatus },
): BeoField<string | null> {
  for (const slice of slices) {
    const current = read(slice.block);
    if (current.value) {
      return field(current.value, inherited(current.status), "budget.block");
    }
  }
  return field(null, "PENDING", "budget.block");
}

function guaranteeOf(slices: Slice[], kind: BeoKind): BeoField<number | null> {
  const preferred = slices.filter((slice) => slice.block.kind === "EVENTO");
  const pool = preferred.length > 0 ? preferred : slices;
  for (const slice of pool) {
    if (slice.block.pax.value !== null) {
      return field(slice.block.pax.value, inherited(slice.block.pax.status), "budget.pax");
    }
  }
  if (kind === "MONTAJE") {
    return field(null, "RULE", "rule:rn-19");
  }
  return field(null, "PENDING", "budget.pax");
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

function resolveSection(item: BudgetItem, section: BudgetSection): string | null {
  const declared = item.section.value ?? section.target.value;
  if (declared === "EXCLUIR") {
    return null;
  }
  if (declared) {
    return declared;
  }
  const haystack = `${section.headerRaw} ${item.description}`.toLowerCase();
  if (haystack.includes("internet") || haystack.includes("sistema")) return "SISTEMAS";
  if (haystack.includes("personal")) return "PERSONAL";
  if (haystack.includes("alimento")) return "ALIMENTOS";
  if (haystack.includes("bebida")) return "BEBIDAS";
  if (haystack.includes("acceso")) return "ACCESOS";
  if (haystack.includes("descorche")) return "DESCORCHE";
  if (haystack.includes("mobiliario")) return "MOBILIARIO";
  if (haystack.includes("electric")) return "ELECTRICIDAD";
  return "PENDIENTE";
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

function personnelGroup(block: BudgetBlock, header: string): string {
  const normalized = header.toLowerCase();
  if (normalized.includes("desmont")) return "Desmontaje";
  if (normalized.includes("montaje")) return "Montaje";
  if (block.kind === "MONTAJE") return "Montaje";
  if (block.kind === "DESMONTAJE") return "Desmontaje";
  return "Evento";
}

function toLine(
  item: BudgetItem,
  section: BudgetSection,
  block: BudgetBlock,
  resolved: string,
): BeoLine {
  const price = unitPrice(item);
  const description = resolved === "ALIMENTOS" ? item.description.trim() : oneLine(item.description);
  const marks = item.flags.filter((flag) => flag === "AM" || flag === "PM");
  const marked = marks.length > 0 ? `${description} ${marks.join(" ")}` : description;
  const status = lineStatus(item, section);
  if (resolved === "ALIMENTOS") {
    const parts = [
      marked,
      `N° pax: ${item.qty}`,
      `PRECIO: USD ${price === null ? "—" : formatCents(price)} c/u x ${item.qty} pax`,
    ];
    if (block.schedule.value) {
      parts.push(`Hora: ${block.schedule.value}`);
    }
    return {
      section: resolved,
      group: "",
      qty: item.qty,
      description: marked,
      unitPriceCents: price,
      text: parts.join("\n"),
      status,
      source: "budget.item",
    };
  }
  const group = resolved === "PERSONAL" ? personnelGroup(block, section.headerRaw) : "";
  return {
    section: resolved,
    group,
    qty: item.qty,
    description: marked,
    unitPriceCents: price,
    text: personnelLine(item.qty, marked, price),
    status,
    source: "budget.item",
  };
}

function collectLines(slices: Slice[]): { food: BeoLine[]; sections: BeoDraft["sections"] } {
  const food: BeoLine[] = [];
  const bySection = new Map<string, BeoLine[]>();
  for (const slice of slices) {
    for (const section of slice.block.sections) {
      for (const item of section.items) {
        const resolved = resolveSection(item, section);
        if (!resolved) {
          continue;
        }
        const line = toLine(item, section, slice.block, resolved);
        if (resolved === "ALIMENTOS") {
          food.push(line);
          continue;
        }
        const bucket = bySection.get(resolved) ?? [];
        bucket.push(line);
        bySection.set(resolved, bucket);
      }
    }
  }

  const sections: BeoDraft["sections"] = [];
  for (const section of RIGHT_SECTIONS) {
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

function buildDraft(budget: ParsedBudget, slices: Slice[], texts: FixedTexts): BeoDraft {
  const blocks = slices.map((slice) => slice.block);
  const kind = kindOf(blocks);
  const salon = slices[0]?.salon ?? "Por definir";
  const date = slices[0]?.date ?? "";
  const schedulePool =
    kind === "MONTAJE"
      ? slices.filter((slice) => slice.block.kind === "MONTAJE")
      : slices.filter((slice) => slice.block.kind === "EVENTO");
  const schedule = firstText(schedulePool.length > 0 ? schedulePool : slices, (block) => block.schedule);
  const setupPool = slices.filter((slice) => slice.block.kind === "MONTAJE");
  const setup = firstText(setupPool.length > 0 ? setupPool : slices, (block) => block.setup);
  const lines = collectLines(slices);
  const title = budget.eventTitle ?? "";

  return {
    date,
    salon,
    kind,
    needsReview: slices.some((slice) => slice.needsReview),
    company: clientField(budget.client.company, "budget.client.company"),
    contact: clientField(budget.client.contact, "budget.client.contact"),
    phone: clientField(budget.client.phones, "budget.client.phone"),
    address: clientField(budget.client.address, "budget.client.address"),
    weekday: field(spanishWeekday(date), "RULE", "rule:date"),
    formattedDate: field(formatBeoDate(date), "RULE", "rule:date"),
    schedule,
    eventType: field(eventLabel(title, kind), "RULE", "rule:event-type"),
    salonName: field(salon, slices.some((slice) => slice.needsReview) ? "REVIEW" : inherited(blocks[0]?.salon.status ?? "PENDING"), "budget.salon"),
    guarantee: guaranteeOf(slices, kind),
    rentCents: rentOf(slices),
    billboard: field(budget.eventTitle, "PENDING", "suggestion:event-title"),
    setup,
    specialInstructions: field(texts.specialInstructions, "RULE", "config.special-instructions"),
    servicePreparation: field(texts.servicePreparation, "RULE", "config.service-preparation"),
    food: lines.food,
    sections: lines.sections,
  };
}

/** Propone una B.E.O. por fecha y salón a partir del presupuesto ya leído. */
export function proposeBeos(budget: ParsedBudget, texts: FixedTexts): BeoDraft[] {
  const groups = new Map<string, Slice[]>();
  for (const slice of expand(budget)) {
    const key = `${slice.date}\u0000${slice.salon}`;
    const group = groups.get(key) ?? [];
    group.push(slice);
    groups.set(key, group);
  }
  return [...groups.values()].map((slices) => buildDraft(budget, slices, texts));
}

import {
  resolveBlockKind,
  seedBlockHeaderEntries,
  type BlockHeaderEntry,
} from "../config/block-headers";
import { classifyCatalogItem, resolveSalonText, resolveSectionHeader } from "../config/resolve";
import type { CatalogItemEntry, SalonCatalogEntry, SectionMappingEntry } from "../config/resolve";
import { normalizeLabel } from "../config/normalize";
import {
  FALLBACK_COLUMNS,
  columnsFromHeader,
  isTableHeader,
  minX,
  textInColumn,
  type ColumnBounds,
} from "./columns";
import { parseDateList } from "./dates";
import { groupLines, lineText, type TextFragment, type TextLine } from "./fragments";
import {
  emptyClient,
  emptyHeader,
  tracked,
  type BlockKind,
  type BudgetBlock,
  type BudgetDay,
  type BudgetSection,
  type FieldStatus,
  type ParsedBudget,
  type ReconciliationLine,
} from "./model";
import { isCourtesyAmount, parseAmount, stripMoney } from "./money";
import { parsedBudgetSchema } from "./schema";

export type BudgetCatalog = {
  salons: SalonCatalogEntry[];
  mappings: SectionMappingEntry[];
  items: CatalogItemEntry[];
  keywords: string[];
  /** Si falta, el parser usa las variantes semilla de encabezado de bloque. */
  blockHeaders?: BlockHeaderEntry[];
};

export type ParseBudgetOptions = {
  catalog?: BudgetCatalog;
  keywords?: string[];
};

type LineKind =
  | "table"
  | "date"
  | "block"
  | "section"
  | "totals"
  | "benefits"
  | "clauses"
  | "anchor"
  | "text"
  | "title"
  | "fields"
  | "ignore";

type MarkedLine = TextLine & { kind: LineKind; columns: ColumnBounds };

const FIELD_LABELS: Record<string, string> = {
  localizador: "locator",
  emision: "issuedOn",
  "check in": "checkIn",
  "check out": "checkOut",
  ejecutivo: "executive",
  cargo: "role",
  email: "email",
  telefono: "phone",
  empresa: "company",
  evento: "eventLabel",
  "persona contacto": "contact",
  telefonos: "phones",
  telf: "phones",
  "direccion fiscal": "address",
  "correo electronico": "clientEmail",
  "c.i. rif": "rif",
  "r.i.f": "rif",
  rif: "rif",
  trn: "rif",
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function labelKey(value: string): string {
  return fold(value).replace(/:+/g, " ").replace(/\.+$/g, "").replace(/\s+/g, " ").trim();
}

function isAllCaps(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  return letters.length >= 3 && letters.every((letter) => letter === letter.toUpperCase());
}

function isConfiguredBlockTitle(text: string, headers: BlockHeaderEntry[]): boolean {
  const name = normalizeLabel(text);
  return Boolean(name) && headers.some((header) => header.normalized === name);
}

function isBlockTitle(text: string, headers: BlockHeaderEntry[]): boolean {
  if (isConfiguredBlockTitle(text, headers)) {
    return true;
  }
  if (text.includes(":") || !isAllCaps(text)) {
    return false;
  }
  const name = normalizeLabel(text);
  if (/^personal\b/.test(name)) {
    return false;
  }
  return /^(montaje|desmontaje|evento|event|setup|disassembly)\b/.test(name);
}

function kindFromTitle(text: string, headers: BlockHeaderEntry[]): BlockKind {
  return resolveBlockKind(text, headers);
}

function isBenefitHeader(text: string): boolean {
  const name = fold(text);
  return name.length < 60 && /^beneficios\b/.test(name);
}

function isClauseHeader(text: string): boolean {
  const name = fold(text);
  return (
    name.length < 90 &&
    (/clausulas y condiciones/.test(name) ||
      /contract clauses/.test(name) ||
      /^clausulas generales\b/.test(name))
  );
}

function totalsKey(
  text: string,
): "subtotal" | "iva" | "logistics" | "general" | "igtf" | "payable" | null {
  const name = fold(text).replace(/-/g, " ").replace(/\s+/g, " ");
  if (/^sub total\b/.test(name)) {
    return "subtotal";
  }
  if (/^iva\b/.test(name)) {
    return "iva";
  }
  if (/^logistica\b/.test(name)) {
    return "logistics";
  }
  if (/igtf/.test(name) && /total/.test(name)) {
    return "payable";
  }
  if (/^igtf\b/.test(name)) {
    return "igtf";
  }
  if (/divisa|a pagar|total general usd|con igtf/.test(name)) {
    return "payable";
  }
  if (/total general/.test(name)) {
    return "general";
  }
  return null;
}

function isSectionLine(line: TextLine, columns: ColumnBounds, text: string): boolean {
  const description = textInColumn(line, columns, "descripcion");
  const rate = textInColumn(line, columns, "tarifa");
  const total = textInColumn(line, columns, "total");
  if (!description && (rate || total)) {
    return false;
  }
  const name = normalizeLabel(text);
  if (
    minX(line) > 210 &&
    /^(personal|alimentos|bebidas|sistemas|descorche|accesos?|mobiliario|electricidad|habitacion|food|beverage|service|sunday|cena|salones)\b/.test(
      name,
    )
  ) {
    return true;
  }
  if (isAllCaps(text) && text.length < 80 && minX(line) > 220) {
    return true;
  }
  const words = text.split(/\s+/).filter(Boolean);
  return minX(line) > 255 && words.length <= 3 && text.length < 40 && !/\d/.test(text);
}

function isAnchorLine(line: TextLine, columns: ColumnBounds): boolean {
  if (/^\d{1,4}$/.test(textInColumn(line, columns, "cantidad"))) {
    return true;
  }
  const quantity = line.fragments.some(
    (fragment) => fragment.x < 120 && /^\d{1,4}$/.test(fragment.text.trim()),
  );
  if (!quantity) {
    return false;
  }
  return Boolean(textInColumn(line, columns, "tarifa") || textInColumn(line, columns, "total"));
}

function hasBodyText(line: TextLine, columns: ColumnBounds): boolean {
  return Boolean(
    textInColumn(line, columns, "descripcion") || textInColumn(line, columns, "tarifa"),
  );
}

function isTitleLine(text: string, headers: BlockHeaderEntry[]): boolean {
  if (fold(text).includes("datos del cliente") || isBlockTitle(text, headers) || parseDateList(text)) {
    return false;
  }
  return isAllCaps(text) && text.length <= 80;
}

function hasFieldLabel(line: TextLine): boolean {
  return line.fragments.some((fragment) => FIELD_LABELS[labelKey(fragment.text)] !== undefined);
}

function classify(
  line: TextLine,
  columns: ColumnBounds,
  inBody: boolean,
  headers: BlockHeaderEntry[],
): LineKind {
  const text = lineText(line);
  if (!text) {
    return "ignore";
  }
  if (isTableHeader(text)) {
    return "table";
  }
  if (!hasFieldLabel(line) && parseDateList(text)) {
    return "date";
  }
  if (isClauseHeader(text)) {
    return "clauses";
  }
  if (isBenefitHeader(text)) {
    return "benefits";
  }
  if (totalsKey(text)) {
    return "totals";
  }
  if (!inBody) {
    if (isBlockTitle(text, headers)) {
      return "block";
    }
    if (isTitleLine(text, headers)) {
      return "title";
    }
    return "fields";
  }
  if (isAnchorLine(line, columns)) {
    return "anchor";
  }
  if (isBlockTitle(text, headers)) {
    return "block";
  }
  if (isSectionLine(line, columns, text)) {
    return "section";
  }
  if (hasBodyText(line, columns)) {
    return "text";
  }
  return "ignore";
}

function cleanSalon(text: string): string {
  return text
    .replace(/^sal[oó]n\s*:?\s*/i, "")
    .replace(/\s+room$/i, "")
    .replace(/\s*-\s*caracas$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function afterColon(text: string): string {
  const index = text.indexOf(":");
  return (index >= 0 ? text.slice(index + 1) : text).replace(/\s+/g, " ").trim();
}

function mergeContinuations(lines: string[]): string[] {
  const merged: string[] = [];
  for (const line of lines) {
    const previous = merged.at(-1);
    if (previous && (/^[:)]/.test(line) || /^[a-záéíóúñ]/.test(line))) {
      merged[merged.length - 1] = `${previous} ${line}`
        .replace(/(\d)\s+:(\d{2})/g, "$1:$2")
        .replace(/\s+/g, " ")
        .trim();
      continue;
    }
    merged.push(line);
  }
  return merged;
}

function descriptionLines(anchor: MarkedLine, extras: MarkedLine[]): string[] {
  const source = [anchor, ...extras].sort((a, b) => a.page - b.page || b.y - a.y);
  const lines: string[] = [];
  for (const line of source) {
    const text = textInColumn(line, line.columns, "descripcion");
    if (text) {
      lines.push(text);
    }
  }
  return mergeContinuations(lines);
}

function columnBlob(anchor: MarkedLine, extras: MarkedLine[], name: "tarifa" | "total"): string {
  return [anchor, ...extras]
    .sort((a, b) => a.page - b.page || b.y - a.y)
    .map((line) => textInColumn(line, line.columns, name))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function integerIn(line: MarkedLine, name: "cantidad" | "noches"): number | null {
  const text = textInColumn(line, line.columns, name);
  return /^\d{1,4}$/.test(text) ? Number(text) : null;
}

function readPax(lines: string[]): { value: number | null; status: FieldStatus } {
  if (lines.some((line) => /pax\s*:\s*(?:\.\.\.|…)?\s*$/i.test(line))) {
    return { value: null, status: "PENDING" };
  }
  for (const line of lines) {
    if (/montaje|setup style/i.test(line)) {
      continue;
    }
    const match =
      line.match(/(\d+)\s*personas?\b/i) ||
      line.match(/pax\s*:\s*(\d+)/i) ||
      line.match(/capacity\s*:\s*(\d+)/i) ||
      line.match(/n[°ºo]\s*(\d+)/i);
    if (match) {
      return { value: Number(match[1]), status: "RULE" };
    }
  }
  return { value: null, status: "PENDING" };
}

function salonMeta(lines: string[]) {
  let salonRaw: string | null = null;
  let schedule: string | null = null;
  let setupSchedule: string | null = null;
  let setup: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    const next = lines[index + 1];
    if (next && /^:\d{2}/.test(next)) {
      line = `${line} ${next}`.replace(/(\d)\s+:(\d{2})/g, "$1:$2");
      index += 1;
    }
    if (/sal[oó]n\b|\broom$/i.test(line)) {
      salonRaw = cleanSalon(line);
      continue;
    }
    if (/horario de montaje|setup schedule/i.test(line)) {
      setupSchedule = afterColon(line);
      continue;
    }
    if (/horario de evento|^horario\s*:|^hora\s*:/i.test(line)) {
      schedule = afterColon(line);
      continue;
    }
    if (/tipo de montaje|setup style|^montaje\s*:/i.test(line)) {
      setup = afterColon(line);
    }
  }

  if (!schedule && setupSchedule) {
    schedule = setupSchedule;
  } else if (schedule && setupSchedule) {
    schedule = `${schedule} / montaje ${setupSchedule}`;
  }

  const pax = readPax(lines);
  const setupPending = !setup || /por definir|^\.\.\.$/i.test(setup);
  return {
    salonRaw,
    schedule: tracked(schedule, schedule ? "RULE" : "PENDING"),
    setup: tracked(setup, setupPending ? "PENDING" : "RULE"),
    pax: tracked(pax.value, pax.status),
  };
}

function isSalonRow(lines: string[], rate: string, total: string): boolean {
  const first = lines[0]?.trim() ?? "";
  if (/^sal[oó]n\b/i.test(first) || /\broom$/i.test(first)) {
    return true;
  }
  return /renta|rental|cortes[ií]a|incluido en el/i.test(`${rate} ${total}`);
}

function rentFrom(rate: string, total: string) {
  const courtesy = isCourtesyAmount(`${rate} ${total}`);
  const discount = stripMoney(rate)
    .replace(/renta regular:?/gi, " ")
    .replace(/regular rental:?/gi, " ")
    .replace(/incluido en el evento/gi, " ")
    .replace(/cortes[ií]a/gi, " ")
    .replace(/\busd\b|\$/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\d]+/u, "")
    .trim();
  return {
    regular: parseAmount(rate),
    net: courtesy ? null : parseAmount(total),
    discountLabel: discount || null,
    courtesy,
  };
}

function flagsFor(rate: string, total: string): string[] {
  const flags: string[] = [];
  if (isCourtesyAmount(`${rate} ${total}`)) {
    flags.push("courtesy");
  }
  if (/[()]/.test(`${rate}${total}`) || /(?:^|\s)-\s*\d|\d\s*-(?:\s|$)/.test(`${rate} ${total}`)) {
    flags.push("decorated");
  }
  return flags;
}

function emptyBlock(kind: BlockKind, rawTitle: string, page: number): BudgetBlock {
  const salonInTitle = rawTitle.match(/sal[oó]n\s+(.+)$/i);
  return {
    kind,
    rawTitle,
    salonRaw: salonInTitle ? cleanSalon(salonInTitle[1]) : null,
    salon: tracked(null, "PENDING"),
    schedule: tracked(null, "PENDING"),
    setup: tracked(null, "PENDING"),
    pax: tracked(null, "PENDING"),
    nights: null,
    rent: { regular: null, net: null, discountLabel: null, courtesy: false },
    sections: [],
    page,
  };
}

function absorbFields(line: TextLine, budget: ParsedBudget): void {
  let current: string | null = null;
  const parts: string[] = [];
  const flush = () => {
    if (!current) {
      return;
    }
    const value = parts.join(" ").replace(/\s+/g, " ").trim();
    const target = FIELD_LABELS[current];
    parts.length = 0;
    current = null;
    if (!value || !target) {
      return;
    }
    if (target === "locator") budget.header.locator = value;
    else if (target === "issuedOn") budget.header.issuedOn = value;
    else if (target === "checkIn") budget.header.checkIn = value;
    else if (target === "checkOut") budget.header.checkOut = value;
    else if (target === "executive") budget.header.executive = value;
    else if (target === "role") budget.header.role = value;
    else if (target === "email") budget.header.email = value;
    else if (target === "phone") budget.header.phone = value;
    else if (target === "company") budget.client.company = value;
    else if (target === "eventLabel" && !budget.client.company) budget.client.company = value;
    else if (target === "contact") budget.client.contact = value;
    else if (target === "phones") budget.client.phones = value;
    else if (target === "address") budget.client.address = value;
    else if (target === "clientEmail") budget.client.email = value;
    else if (target === "rif") budget.client.rif = value;
  };

  for (const fragment of line.fragments) {
    const key = labelKey(fragment.text);
    if (FIELD_LABELS[key]) {
      flush();
      current = key;
      const rest = fragment.text.includes(":")
        ? fragment.text.slice(fragment.text.indexOf(":") + 1).trim()
        : "";
      if (rest) {
        parts.push(rest);
      }
      continue;
    }
    if (current) {
      parts.push(fragment.text.trim());
    }
  }
  flush();
}

function cluster(lines: MarkedLine[], gap: number): MarkedLine[][] {
  const sorted = [...lines].sort((a, b) => a.page - b.page || b.y - a.y);
  const groups: MarkedLine[][] = [];
  for (const line of sorted) {
    const current = groups.at(-1);
    const previous = current?.at(-1);
    if (current && previous && previous.page === line.page && previous.y - line.y <= gap) {
      current.push(line);
      continue;
    }
    groups.push([line]);
  }
  return groups;
}

/**
 * El texto se queda en el ítem de arriba, salvo que el ancla de abajo esté más cerca.
 * Si el título del ítem siguiente queda en medio, hace falta una diferencia clara (8 px)
 * para soltar la nota del ítem de arriba.
 */
function chooseAnchor(anchors: MarkedLine[], cluster: MarkedLine[], texts: MarkedLine[]): MarkedLine | null {
  const page = cluster[0]?.page;
  const y = cluster[Math.floor(cluster.length / 2)]?.y;
  if (page === undefined || y === undefined) {
    return null;
  }
  const above = anchors.filter((anchor) => anchor.y > y).sort((left, right) => left.y - right.y)[0];
  const below = anchors.filter((anchor) => anchor.y <= y).sort((left, right) => right.y - left.y)[0];
  if (!above) {
    return below ?? null;
  }
  if (!below) {
    return above;
  }
  const gapAbove = above.y - y;
  const gapBelow = y - below.y;
  const blocked = texts.some(
    (line) => line.page === page && !cluster.includes(line) && line.y < y && line.y > below.y,
  );
  if (!blocked && gapBelow < gapAbove) {
    return below;
  }
  if (gapBelow + 8 < gapAbove) {
    return below;
  }
  return above;
}

function assignText(lines: MarkedLine[]): Map<MarkedLine, MarkedLine[]> {
  const assigned = new Map<MarkedLine, MarkedLine[]>();
  let bucket: MarkedLine[] = [];

  const flush = () => {
    const anchors = bucket.filter((line) => line.kind === "anchor");
    const texts = bucket.filter((line) => line.kind === "text");
    for (const group of cluster(texts, 11)) {
      const median = group[Math.floor(group.length / 2)];
      const samePage = anchors.filter((line) => line.page === median.page);
      const pool = samePage.length > 0 ? samePage : anchors;
      const anchor = chooseAnchor(pool, group, texts);
      if (!anchor) {
        continue;
      }
      const list = assigned.get(anchor) ?? [];
      list.push(...group);
      assigned.set(anchor, list);
    }
    bucket = [];
  };

  let page = 0;
  for (const line of lines) {
    if (line.page !== page) {
      flush();
      page = line.page;
    }
    if (line.kind === "anchor" || line.kind === "text") {
      bucket.push(line);
      continue;
    }
    if (
      line.kind === "section" ||
      line.kind === "block" ||
      line.kind === "date" ||
      line.kind === "totals" ||
      line.kind === "benefits" ||
      line.kind === "clauses"
    ) {
      flush();
    }
  }
  flush();
  return assigned;
}

function blockHasContent(block: BudgetBlock): boolean {
  return (
    block.rent.courtesy ||
    block.rent.net !== null ||
    block.rent.regular !== null ||
    block.sections.some((entry) => entry.items.length > 0)
  );
}

function applyRules(budget: ParsedBudget, catalog: BudgetCatalog | undefined): void {
  if (!catalog) {
    return;
  }
  for (const day of budget.days) {
    for (const block of day.blocks) {
      if (block.salonRaw) {
        const resolved = resolveSalonText(block.salonRaw, catalog.salons);
        block.salon =
          resolved.status === "resolved"
            ? tracked(resolved.name, "RULE")
            : tracked(null, "PENDING");
      }
      for (const section of block.sections) {
        const header = section.headerRaw
          ? resolveSectionHeader(section.headerRaw, catalog.mappings)
          : { status: "unresolved" as const };
        if (header.status === "resolved") {
          section.target = tracked(header.section, "RULE");
        }
        for (const item of section.items) {
          const firstLine = item.description.split("\n")[0] ?? item.description;
          if (header.status === "resolved") {
            item.section = tracked(
              classifyCatalogItem(firstLine, header.section, catalog.items),
              "RULE",
            );
            continue;
          }
          const match = catalog.items.find(
            (entry) => entry.normalized === normalizeLabel(firstLine),
          );
          item.section = match ? tracked(match.section, "RULE") : tracked(null, "PENDING");
        }
      }
    }
  }
}

function rememberClauses(budget: ParsedBudget, clauses: string[], keywords: string[]): void {
  const source = normalizeLabel(`${budget.benefits.join("\n")}\n${clauses.join("\n")}`);
  budget.triggers = keywords.filter((keyword) => {
    const needle = normalizeLabel(keyword);
    return Boolean(needle) && source.includes(needle);
  });
}

function reconcile(budget: ParsedBudget): void {
  const lines: ReconciliationLine[] = [];
  let actual = 0;
  for (const day of budget.days) {
    for (const block of day.blocks) {
      if (block.rent.courtesy) {
        lines.push({
          description: `Renta ${block.salonRaw ?? block.rawTitle} (cortesía)`,
          total: 0,
        });
      } else if (block.rent.net !== null) {
        actual += block.rent.net;
        lines.push({
          description: `Renta ${block.salonRaw ?? block.rawTitle}`,
          total: block.rent.net,
        });
      }
      for (const section of block.sections) {
        for (const item of section.items) {
          actual += item.total ?? 0;
          lines.push({
            description: item.description.split("\n")[0] || item.description,
            total: item.total ?? 0,
          });
          if (item.total === null) {
            budget.warnings.push(`Ítem sin total: ${item.description.split("\n")[0]}`);
          }
        }
      }
    }
  }
  const expected = budget.totals.subtotal;
  budget.reconciliation = {
    expected,
    actual,
    difference: expected === null ? null : actual - expected,
    lines,
    ok: expected !== null && actual === expected,
  };
}

function yearFrom(budget: ParsedBudget): number | undefined {
  for (const value of [budget.header.checkIn, budget.header.checkOut, budget.header.issuedOn]) {
    const match = value?.match(/(\d{4})/);
    if (match) {
      return Number(match[1]);
    }
  }
  return undefined;
}

/** Convierte fragmentos con coordenadas en el presupuesto estructurado. */
export function parseBudget(
  fragments: TextFragment[],
  options: ParseBudgetOptions = {},
): ParsedBudget {
  const lines = groupLines(fragments);
  const pageColumns = new Map<number, ColumnBounds>();
  let latest: ColumnBounds | null = null;
  let sawTable = false;
  for (const line of lines) {
    if (!isTableHeader(lineText(line))) {
      continue;
    }
    const detected = columnsFromHeader(line) ?? FALLBACK_COLUMNS;
    pageColumns.set(line.page, detected);
    latest = detected;
    sawTable = true;
  }

  const blockHeaders = options.catalog?.blockHeaders ?? seedBlockHeaderEntries();
  const columnsFor = (page: number): ColumnBounds =>
    pageColumns.get(page) ?? latest ?? FALLBACK_COLUMNS;
  const firstTable = lines.findIndex((line) => isTableHeader(lineText(line)));
  const firstDate = lines.findIndex(
    (line) => !hasFieldLabel(line) && Boolean(parseDateList(lineText(line))),
  );
  const bodyStart = firstTable >= 0 ? firstTable + 1 : firstDate >= 0 ? firstDate : lines.length;
  const marked: MarkedLine[] = lines.map((line, index) => {
    const columns = columnsFor(line.page);
    return { ...line, columns, kind: classify(line, columns, index >= bodyStart, blockHeaders) };
  });

  const budget: ParsedBudget = {
    header: emptyHeader(),
    client: emptyClient(),
    eventTitle: null,
    days: [],
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

  for (const line of marked) {
    if (line.kind === "title") {
      budget.eventTitle = lineText(line);
    } else if (line.kind === "fields") {
      absorbFields(line, budget);
    }
  }

  if (!sawTable) {
    budget.structureErrors.push({
      page: 1,
      section: "tabla",
      message: "No se encontró el encabezado de la tabla.",
    });
    budget.warnings.push(
      "No apareció el encabezado de tabla; se usaron las columnas habituales de la plantilla.",
    );
  }
  if (!budget.header.locator && !budget.client.company) {
    budget.structureErrors.push({
      page: 1,
      section: "cabecera",
      message: "No se encontró la cabecera del presupuesto.",
    });
  }

  const attached = assignText(marked);
  const cursor: {
    day: BudgetDay | null;
    block: BudgetBlock | null;
    section: BudgetSection | null;
  } = { day: null, block: null, section: null };
  let mode: "body" | "totals" | "benefits" | "clauses" = "body";
  const clauses: string[] = [];
  let lastPage = 1;

  const finishBlock = () => {
    const block = cursor.block;
    const day = cursor.day;
    if (!block || !day) {
      cursor.block = null;
      cursor.section = null;
      return;
    }
    block.sections = block.sections.filter((entry) => entry.items.length > 0);
    if (blockHasContent(block)) {
      day.blocks.push(block);
      if (block.nights && day.dates.length > 0 && block.nights !== day.dates.length) {
        budget.warnings.push(
          `El bloque de ${block.salonRaw ?? block.rawTitle ?? "sin salón"} indica ${block.nights} noches y la fecha cubre ${day.dates.length} días.`,
        );
      }
    }
    cursor.block = null;
    cursor.section = null;
  };

  const startDay = (dates: string[], raw: string) => {
    finishBlock();
    if (cursor.day && cursor.day.blocks.length === 0) {
      budget.days = budget.days.filter((entry) => entry !== cursor.day);
    }
    cursor.day = { dates, raw, blocks: [] };
    budget.days.push(cursor.day);
  };

  const startBlock = (kind: BlockKind, title: string, page: number) => {
    finishBlock();
    if (!cursor.day) {
      startDay([], "");
    }
    cursor.block = emptyBlock(kind, title, page);
    cursor.section = null;
  };

  const ensureBlock = (page: number) => {
    if (!cursor.day) {
      startDay(
        parseDateList(budget.header.checkIn ?? "", yearFrom(budget)) ?? [],
        budget.header.checkIn ?? "",
      );
    }
    if (!cursor.block) {
      startBlock("EVENTO", "", page);
    }
  };

  const openSection = (headerRaw: string) => {
    if (!cursor.block) {
      return;
    }
    if (cursor.section?.headerRaw === headerRaw) {
      return;
    }
    cursor.section = { headerRaw, target: tracked(null, "PENDING"), items: [] };
    cursor.block.sections.push(cursor.section);
  };

  for (const line of marked) {
    lastPage = line.page;
    if (line.kind === "clauses" || mode === "clauses") {
      mode = "clauses";
      clauses.push(lineText(line));
      continue;
    }
    if (line.kind === "benefits") {
      mode = "benefits";
      continue;
    }
    if (mode === "benefits") {
      const raw = lineText(line);
      const text = raw.replace(/^[*\u2022]\s*/, "").trim();
      if (!text || line.kind === "totals") {
        continue;
      }
      if (budget.benefits.length > 0 && !/^[*•]/.test(raw)) {
        budget.benefits[budget.benefits.length - 1] += ` ${text}`;
      } else {
        budget.benefits.push(text);
      }
      continue;
    }
    if (line.kind === "totals") {
      mode = "totals";
      const key = totalsKey(lineText(line));
      const amount =
        parseAmount(textInColumn(line, line.columns, "total")) ?? parseAmount(lineText(line));
      if (key) {
        budget.totals[key] = amount;
      }
      continue;
    }
    if (
      mode === "totals" ||
      line.kind === "table" ||
      line.kind === "text" ||
      line.kind === "ignore"
    ) {
      continue;
    }
    if (line.kind === "fields" || line.kind === "title") {
      continue;
    }
    if (line.kind === "date") {
      startDay(parseDateList(lineText(line), yearFrom(budget)) ?? [], lineText(line));
      continue;
    }
    if (line.kind === "block") {
      startBlock(kindFromTitle(lineText(line), blockHeaders), lineText(line), line.page);
      continue;
    }
    if (line.kind === "section") {
      ensureBlock(line.page);
      openSection(lineText(line));
      continue;
    }
    if (line.kind !== "anchor") {
      continue;
    }

    ensureBlock(line.page);
    const extras = attached.get(line) ?? [];
    const linesOfItem = descriptionLines(line, extras);
    const description = linesOfItem.join("\n");
    const rate = columnBlob(line, extras, "tarifa");
    const totalText = columnBlob(line, extras, "total");
    const nights = integerIn(line, "noches") ?? 0;
    const qty = integerIn(line, "cantidad") ?? 0;

    if (isSalonRow(linesOfItem, rate, totalText)) {
      const current = cursor.block;
      if (
        current &&
        (current.rent.net !== null ||
          current.rent.regular !== null ||
          current.rent.courtesy ||
          current.sections.some((entry) => entry.items.length > 0))
      ) {
        startBlock(current.kind, current.rawTitle, line.page);
      }
      if (!cursor.block) {
        continue;
      }
      const meta = salonMeta(linesOfItem);
      cursor.block.salonRaw = meta.salonRaw ?? cursor.block.salonRaw;
      cursor.block.schedule = meta.schedule;
      cursor.block.setup = meta.setup;
      cursor.block.pax = meta.pax;
      cursor.block.nights = nights || null;
      cursor.block.rent = rentFrom(rate, totalText);
      cursor.block.page = line.page;
      continue;
    }

    if (!cursor.section) {
      openSection("");
    }
    cursor.section?.items.push({
      qty,
      description,
      nights,
      unitPrice: parseAmount(rate),
      total: parseAmount(totalText),
      flags: flagsFor(rate, totalText),
      section: tracked(null, "PENDING"),
    });
  }

  finishBlock();
  budget.days = budget.days.filter((entry) => entry.blocks.length > 0);
  if (budget.days.length === 0) {
    budget.structureErrors.push({
      page: 1,
      section: "bloques",
      message: "No se encontró ningún bloque de evento.",
    });
  }
  if (budget.totals.subtotal === null) {
    budget.structureErrors.push({
      page: lastPage,
      section: "totales",
      message: "No se encontró la sección de totales.",
    });
  }

  applyRules(budget, options.catalog);
  rememberClauses(budget, clauses, options.catalog?.keywords ?? options.keywords ?? []);
  reconcile(budget);
  return parsedBudgetSchema.parse(budget);
}

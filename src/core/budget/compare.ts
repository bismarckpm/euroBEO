import type { ParsedBudget } from "./model";

export type BudgetDifference = {
  field: string;
  before: string;
  after: string;
};

type ItemSnap = { qty: number; total: number | null; price: number | null };

function money(cents: number | null): string {
  if (cents === null) {
    return "—";
  }
  const absolute = Math.abs(cents);
  const whole = String(Math.trunc(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${whole},${fraction}`;
}

function itemsOf(budget: ParsedBudget): Map<string, ItemSnap> {
  const map = new Map<string, ItemSnap>();
  for (const day of budget.days) {
    for (const block of day.blocks) {
      for (const section of block.sections) {
        section.items.forEach((item, index) => {
          const name = item.description.split("\n")[0]?.trim() || "ítem";
          const key = `${day.dates.join(",")}|${block.rawTitle}|${name}|${index}`;
          map.set(key, { qty: item.qty, total: item.total, price: item.unitPrice });
        });
      }
    }
  }
  return map;
}

/** Diferencias de ítems, cantidades, montos, fechas y salones. Si no hay, la lista queda vacía. */
export function compareBudgets(previous: ParsedBudget, next: ParsedBudget): BudgetDifference[] {
  const differences: BudgetDifference[] = [];
  const previousDates = previous.days.map((day) => day.dates.join(", ")).join(" | ");
  const nextDates = next.days.map((day) => day.dates.join(", ")).join(" | ");
  if (previousDates !== nextDates) {
    differences.push({ field: "fechas", before: previousDates || "—", after: nextDates || "—" });
  }
  const previousSalons = previous.days
    .flatMap((day) => day.blocks.map((block) => block.salonRaw ?? block.rawTitle))
    .join(" | ");
  const nextSalons = next.days
    .flatMap((day) => day.blocks.map((block) => block.salonRaw ?? block.rawTitle))
    .join(" | ");
  if (previousSalons !== nextSalons) {
    differences.push({ field: "salones", before: previousSalons || "—", after: nextSalons || "—" });
  }
  const before = itemsOf(previous);
  const after = itemsOf(next);
  const keys = new Set([...before.keys(), ...after.keys()]);
  for (const key of keys) {
    const left = before.get(key);
    const right = after.get(key);
    const label = key.split("|")[2] ?? key;
    if (!left || !right) {
      differences.push({
        field: label,
        before: left ? `${left.qty} × ${money(left.total)}` : "—",
        after: right ? `${right.qty} × ${money(right.total)}` : "—",
      });
      continue;
    }
    if (left.qty !== right.qty || left.total !== right.total || left.price !== right.price) {
      differences.push({
        field: label,
        before: `${left.qty} × ${money(left.price)} = ${money(left.total)}`,
        after: `${right.qty} × ${money(right.price)} = ${money(right.total)}`,
      });
    }
  }
  return differences;
}

import type { ArithmeticEquation, ArithmeticIssue, BudgetItem, ParsedBudget } from "./model";

/** Tolerancia de 0,01 en la moneda, es decir un céntimo. */
export const ARITHMETIC_TOLERANCE_CENTS = 1;

function close(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= ARITHMETIC_TOLERANCE_CENTS;
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(Math.round(cents));
  const whole = String(Math.trunc(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${fraction}`;
}

export function amountMessage(cell: string, printed: number, calculated: number): string {
  const difference = printed - calculated;
  return `${cell}: impreso ${formatCents(printed)}, calculado ${formatCents(calculated)}, diferencia ${formatCents(difference)}.`;
}

function pushAlert(
  issues: ArithmeticIssue[],
  equation: ArithmeticEquation,
  cell: string,
  printed: number | null,
  calculated: number,
): void {
  if (printed === null || close(printed, calculated)) {
    return;
  }
  issues.push({
    equation,
    cell,
    printed,
    calculated,
    difference: printed - calculated,
    message: amountMessage(cell, printed, calculated),
    reviewed: false,
  });
}

function pushRow(issues: ArithmeticIssue[], item: BudgetItem): void {
  if (item.unitPrice === null || item.total === null || item.nights <= 0 || item.qty < 0) {
    return;
  }
  const label = item.description.split("\n")[0] || "fila";
  pushAlert(issues, "row", label, item.total, item.qty * item.unitPrice * item.nights);
}

/**
 * Alerta filas, subtotal, IVA, total e IGTF. La logística impresa entra en el total
 * y no se compara con ninguna base. La renta con descuento no se juzga como
 * cantidad × tarifa de lista × días: el total ya es el neto (RN-05).
 */
export function verifyArithmetic(budget: ParsedBudget): ArithmeticIssue[] {
  const issues: ArithmeticIssue[] = [];
  let rows = 0;
  for (const day of budget.days) {
    for (const block of day.blocks) {
      if (!block.rent.courtesy && block.rent.net !== null) {
        rows += block.rent.net;
      }
      for (const section of block.sections) {
        for (const item of section.items) {
          rows += item.total ?? 0;
          pushRow(issues, item);
        }
      }
    }
  }

  const subtotal = budget.totals.subtotal;
  pushAlert(issues, "subtotal", "Subtotal", subtotal, rows);
  if (subtotal !== null) {
    pushAlert(issues, "iva", "IVA", budget.totals.iva, Math.round((subtotal * 16) / 100));
  }
  if (subtotal !== null && budget.totals.iva !== null) {
    const logistics = budget.totals.logistics ?? 0;
    const total = budget.totals.general ?? budget.totals.payable;
    pushAlert(issues, "total", "Total", total, subtotal + budget.totals.iva + logistics);
  }
  const base = budget.totals.general ?? budget.totals.payable;
  if (budget.totals.igtf !== null && base !== null) {
    pushAlert(issues, "igtf", "IGTF", budget.totals.igtf, Math.round((base * 3) / 100));
  }
  return issues;
}

/** Sustituye el monto impreso. Si queda dentro de la tolerancia, la alerta desaparece. */
export function correctAmountAlert(
  issues: ArithmeticIssue[],
  equation: ArithmeticEquation,
  cell: string,
  printed: number,
): ArithmeticIssue[] {
  return issues.flatMap((issue) => {
    if (issue.equation !== equation || issue.cell !== cell) {
      return [issue];
    }
    if (close(printed, issue.calculated)) {
      return [];
    }
    return [
      {
        ...issue,
        printed,
        difference: printed - issue.calculated,
        message: amountMessage(issue.cell, printed, issue.calculated),
        reviewed: false,
      },
    ];
  });
}

/** La asistente deja constancia de que vio la alerta. El monto no cambia. */
export function acknowledgeAmountAlert(
  issues: ArithmeticIssue[],
  equation: ArithmeticEquation,
  cell: string,
): ArithmeticIssue[] {
  return issues.map((issue) =>
    issue.equation === equation && issue.cell === cell ? { ...issue, reviewed: true } : issue,
  );
}

/** Marca los ítems cuya fila ya cuadra, para no pedir validación manual del monto. */
export function markVerifiedRows(budget: ParsedBudget): void {
  const failed = new Set(
    budget.arithmetic?.filter((issue) => issue.equation === "row").map((issue) => issue.cell) ?? [],
  );
  for (const day of budget.days) {
    for (const block of day.blocks) {
      for (const section of block.sections) {
        for (const item of section.items) {
          const label = item.description.split("\n")[0] || "fila";
          if (item.unitPrice === null || item.total === null || item.nights <= 0) {
            continue;
          }
          if (failed.has(label)) {
            continue;
          }
          if (!item.flags.includes("verified")) {
            item.flags.push("verified");
          }
        }
      }
    }
  }
}

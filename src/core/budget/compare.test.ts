import { describe, expect, it } from "vitest";
import { compareBudgets } from "./compare";
import type { ParsedBudget } from "./model";

function budget(qty: number, salon = "Stand"): ParsedBudget {
  return {
    days: [
      {
        dates: ["2026-10-22"],
        blocks: [
          {
            rawTitle: "Montaje",
            salonRaw: salon,
            sections: [
              {
                items: [
                  {
                    description: "Asistentes de servicio",
                    qty,
                    nights: 1,
                    unitPrice: 3900,
                    total: qty * 3900,
                    flags: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  } as unknown as ParsedBudget;
}

describe("compareBudgets", () => {
  it("no reporta diferencias cuando el digital coincide con el escaneo", () => {
    expect(compareBudgets(budget(2), budget(2))).toEqual([]);
  });

  it("muestra solo la cantidad que cambió", () => {
    expect(compareBudgets(budget(2), budget(3))).toEqual([
      {
        field: "Asistentes de servicio",
        before: "2 × 39,00 = 78,00",
        after: "3 × 39,00 = 117,00",
      },
    ]);
  });

  it("lista el total distinto como alerta y no falla la conciliación", () => {
    const scan = budget(2);
    const digital = budget(2);
    scan.totals = { subtotal: 18650, iva: 2984, logistics: 50, general: 21684, igtf: null, payable: null };
    digital.totals = { subtotal: 20000, iva: 2984, logistics: 50, general: 23234, igtf: null, payable: null };
    scan.reconciliation = { expected: 18650, actual: 18650, difference: 0, lines: [], ok: true };
    digital.reconciliation = { expected: 20000, actual: 20000, difference: 0, lines: [], ok: true };
    expect(compareBudgets(scan, digital)).toEqual([
      { field: "Subtotal", before: "186,50", after: "200,00" },
      { field: "Total", before: "216,84", after: "232,34" },
    ]);
    expect(digital.reconciliation.ok).toBe(true);
  });
});

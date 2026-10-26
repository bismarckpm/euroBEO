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
});

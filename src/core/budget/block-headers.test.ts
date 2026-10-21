import { describe, expect, it } from "vitest";
import type { TextFragment } from "./fragments";
import { parseBudget } from "./parse-budget";

function fragment(text: string, x: number, y: number, width = 70): TextFragment {
  return { text, x, y, width, page: 1 };
}

describe("encabezado de bloque configurable", () => {
  it("toma Día previo de montaje como bloque de montaje", () => {
    const budget = parseBudget([
      fragment("Cantidad", 40, 720, 50),
      fragment("Descripción", 160, 720, 80),
      fragment("Día", 330, 720, 30),
      fragment("Moneda", 390, 720, 40),
      fragment("Tarifa", 450, 720, 40),
      fragment("Total", 540, 720, 40),
      fragment("Día previo de montaje", 40, 680, 150),
      fragment("1", 48, 640, 12),
      fragment("Supervisor", 160, 640, 80),
      fragment("1", 336, 640, 12),
      fragment("USD", 396, 640, 24),
      fragment("58,50", 456, 640, 36),
      fragment("58,50", 546, 640, 36),
      fragment("Sub total", 160, 80, 60),
      fragment("186,50", 546, 80, 40),
    ]);

    expect(budget.days[0]?.blocks[0]?.kind).toBe("MONTAJE");
    expect(budget.days[0]?.blocks[0]?.rawTitle).toBe("Día previo de montaje");
  });
});

import { describe, expect, it } from "vitest";
import { groupLines, lineText, type TextFragment } from "./fragments";

function fragment(text: string, x: number, y: number, page = 1): TextFragment {
  return { text, x, y, width: text.length * 4, page };
}

describe("groupLines", () => {
  it("junta fragmentos de la misma fila y separa la siguiente", () => {
    const lines = groupLines(
      [fragment("Cantidad", 80, 500), fragment("Total", 500, 500.8), fragment("1", 90, 480)],
      2,
    );

    expect(lines).toHaveLength(2);
    expect(lineText(lines[0])).toBe("Cantidad Total");
    expect(lineText(lines[1])).toBe("1");
  });
});

import { describe, expect, it } from "vitest";
import { columnsFromHeader, isTableHeader, textInColumn } from "./columns";
import type { TextLine } from "./fragments";

describe("columnsFromHeader", () => {
  it("calcula los límites a partir del encabezado de la tabla", () => {
    const line: TextLine = {
      page: 1,
      y: 500,
      fragments: [
        { text: "Cantidad", x: 80, y: 500, width: 40, page: 1 },
        { text: "Descripción", x: 180, y: 500, width: 50, page: 1 },
        { text: "Noches", x: 320, y: 500, width: 30, page: 1 },
        { text: "Moneda", x: 380, y: 500, width: 30, page: 1 },
        { text: "Tarifa", x: 440, y: 500, width: 30, page: 1 },
        { text: "Total", x: 520, y: 500, width: 20, page: 1 },
      ],
    };

    expect(isTableHeader("Cantidad Descripción Noches Moneda Tarifa Total")).toBe(true);
    const columns = columnsFromHeader(line);
    expect(columns).not.toBeNull();
    if (!columns) {
      return;
    }

    const row: TextLine = {
      page: 1,
      y: 470,
      fragments: [
        { text: "150", x: 90, y: 470, width: 12, page: 1 },
        { text: "Almuerzo", x: 190, y: 470, width: 40, page: 1 },
        { text: "25,00", x: 450, y: 470, width: 24, page: 1 },
        { text: "3.750,00", x: 530, y: 470, width: 36, page: 1 },
      ],
    };
    expect(textInColumn(row, columns, "cantidad")).toBe("150");
    expect(textInColumn(row, columns, "descripcion")).toBe("Almuerzo");
    expect(textInColumn(row, columns, "tarifa")).toBe("25,00");
    expect(textInColumn(row, columns, "total")).toBe("3.750,00");
  });
});

import { describe, expect, it } from "vitest";
import { formatAmount, formatDateDots, formatDateSlash, formatWeekday } from "./format";

describe("formatAmount", () => {
  it("agrupa miles con punto y decimales con coma", () => {
    expect(formatAmount(123456)).toBe("1.234,56");
    expect(formatAmount(100000000)).toBe("1.000.000,00");
    expect(formatAmount(50)).toBe("0,50");
    expect(formatAmount(0)).toBe("0,00");
  });

  it("conserva el signo negativo", () => {
    expect(formatAmount(-123450)).toBe("-1.234,50");
  });

  it("rechaza montos que no son céntimos enteros", () => {
    expect(() => formatAmount(12.5)).toThrow(/céntimos enteros/);
  });
});

describe("fechas", () => {
  const date = new Date(2026, 9, 18);

  it("formatea dd/mm/aaaa y dd.mm.aaaa", () => {
    expect(formatDateSlash(date)).toBe("18/10/2026");
    expect(formatDateDots(date)).toBe("18.10.2026");
  });

  it("escribe el día de la semana en español con mayúscula inicial", () => {
    expect(formatWeekday(date)).toBe("Domingo");
    expect(formatWeekday(new Date(2026, 9, 21))).toBe("Miércoles");
  });

  it("rechaza fechas inválidas", () => {
    expect(() => formatDateSlash(new Date("no-es-fecha"))).toThrow(/inválida/);
  });
});

import { describe, expect, it } from "vitest";
import { formatMemoDate, formatSpanishDayList } from "./days";

describe("lista de días del memorándum", () => {
  it("une tres días del mismo mes con y antes del último", () => {
    expect(formatSpanishDayList(["2026-10-17", "2026-10-15", "2026-10-16"])).toBe(
      "15, 16 y 17 de octubre de 2026",
    );
  });

  it("une dos días con y y deja uno solo sin coma", () => {
    expect(formatSpanishDayList(["2026-10-18", "2026-10-19"])).toBe("18 y 19 de octubre de 2026");
    expect(formatSpanishDayList(["2026-10-22"])).toBe("22 de octubre de 2026");
  });

  it("no repite una fecha y descarta las que no son ISO", () => {
    expect(formatSpanishDayList(["2026-10-15", "2026-10-15", "mañana"])).toBe("15 de octubre de 2026");
    expect(formatSpanishDayList([])).toBe("");
  });

  it("cambia de mes y de año", () => {
    expect(formatSpanishDayList(["2026-10-30", "2026-10-31", "2026-11-01"])).toBe(
      "30 y 31 de octubre y 1 de noviembre de 2026",
    );
    expect(formatSpanishDayList(["2026-12-31", "2027-01-01"])).toBe(
      "31 de diciembre de 2026 y 1 de enero de 2027",
    );
  });

  it("escribe la fecha del memo con del y el calendario de Caracas", () => {
    expect(formatMemoDate(new Date("2026-10-15T16:30:00.000Z"))).toBe("15 de octubre del 2026");
  });
});

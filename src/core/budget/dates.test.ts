import { describe, expect, it } from "vitest";
import { parseDateList } from "./dates";

describe("parseDateList", () => {
  it("lee fechas sueltas, listas y rangos", () => {
    expect(parseDateList("viernes, 23 de octubre de 2026")).toEqual(["2026-10-23"]);
    expect(parseDateList("jueves 1 de octubre de 2026")).toEqual(["2026-10-01"]);
    expect(parseDateList("1 de octubre de 2026")).toEqual(["2026-10-01"]);
    expect(parseDateList("23 y 24 de octubre de 2026")).toEqual(["2026-10-23", "2026-10-24"]);
    expect(parseDateList("del 15 al 19 de octubre de 2026")).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
    ]);
    expect(parseDateList("OCTOBER 15 , 16, 17, 18 and 19, 2026")).toEqual([
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
    ]);
    expect(parseDateList("no es una fecha")).toBeNull();
  });
});

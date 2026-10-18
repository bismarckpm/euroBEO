import { describe, expect, it } from "vitest";
import { formatBeoNumber, parseBeoNumber, proposeNextBeoNumber } from "./sequence";

describe("correlativo", () => {
  it("propone el siguiente número sin modificar el último emitido", () => {
    expect(parseBeoNumber("0.947/26")).toEqual({ lastNumber: 947, year: 26 });
    expect(proposeNextBeoNumber(947, 26)).toBe("0.948/26");
  });

  it("conserva los ceros a la izquierda del formato", () => {
    expect(formatBeoNumber(7, 6)).toBe("0.007/06");
  });

  it("rechaza un código que no sigue 0.NNN/AA", () => {
    expect(parseBeoNumber("947/26")).toBeNull();
    expect(parseBeoNumber("0.947/2026")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { lastAmount, parseAmount } from "./money";

describe("parseAmount", () => {
  it("lee montos europeos, estadounidenses y decorativos como céntimos positivos", () => {
    expect(parseAmount("1.234,56")).toBe(123456);
    expect(parseAmount("1,234.56")).toBe(123456);
    expect(parseAmount("( 25,00)")).toBe(2500);
    expect(parseAmount("- 58,50-")).toBe(5850);
    expect(parseAmount("4,500.00")).toBe(450000);
    expect(parseAmount("9.500,00$")).toBe(950000);
    expect(parseAmount("(4.231,00)")).toBe(423100);
    expect(parseAmount("CORTESÍA")).toBeNull();
    expect(parseAmount("Incluido en el evento")).toBeNull();
    expect(parseAmount("-")).toBeNull();
    expect(lastAmount("16% IVA 2.869,57")).toBe(286957);
    expect(lastAmount("IVA (16%) ( 591,16)")).toBe(59116);
  });
});

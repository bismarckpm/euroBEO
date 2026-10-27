import { describe, expect, it } from "vitest";
import { parseMemoNumber, proposeNextMemoNumber } from "./number";

describe("número de memorándum", () => {
  it("propone el entero siguiente sin consumirlo", () => {
    expect(proposeNextMemoNumber(89)).toBe("90");
    expect(proposeNextMemoNumber(89, ["90"])).toBe("91");
  });

  it("acepta un entero y rechaza el formato de la B.E.O.", () => {
    expect(parseMemoNumber("89")).toBe(89);
    expect(parseMemoNumber("0.948/26")).toBeNull();
  });
});

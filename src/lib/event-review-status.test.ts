import { describe, expect, it } from "vitest";
import { countsTowardPending } from "./event-review";

describe("contador de pendientes", () => {
  it("no cuenta Validar ni Sin dato", () => {
    expect(countsTowardPending("VALIDATE")).toBe(false);
    expect(countsTowardPending("ABSENT")).toBe(false);
    expect(countsTowardPending("RULE")).toBe(false);
  });

  it("cuenta Pendiente, IA y Revisar", () => {
    expect(countsTowardPending("PENDING")).toBe(true);
    expect(countsTowardPending("AI")).toBe(true);
    expect(countsTowardPending("REVIEW")).toBe(true);
  });
});

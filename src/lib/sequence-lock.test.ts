import { describe, expect, it } from "vitest";
import { formatBeoNumber } from "../core/config/sequence";
import { assignNextNumber } from "./sequence-number";
import { createMemorySequenceLock } from "./sequence-lock";

describe("assignNextNumber", () => {
  it("no repite números cuando hay asignaciones simultáneas", async () => {
    const lock = createMemorySequenceLock({ lastNumber: 947, year: 26 });
    const assigned = await Promise.all(
      Array.from({ length: 8 }, () => assignNextNumber(lock, "beo")),
    );
    expect(new Set(assigned).size).toBe(8);
    expect(assigned).toContain("0.948/26");
    expect(assigned).toContain(formatBeoNumber(955, 26));
  });
});

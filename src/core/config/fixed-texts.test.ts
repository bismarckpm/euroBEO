import { describe, expect, it } from "vitest";
import { currentFixedTexts } from "./fixed-texts";

describe("currentFixedTexts", () => {
  it("usa el texto vigente, no uno anterior", () => {
    const before = currentFixedTexts([
      { key: "special_instructions", body: "Texto anterior" },
      { key: "service_preparation", body: "Preparar el salón" },
      { key: "footer_initials", body: "AP" },
    ]);
    const after = currentFixedTexts([
      { key: "special_instructions", body: "Texto nuevo" },
      { key: "service_preparation", body: "Preparar el salón" },
      { key: "footer_initials", body: "AP" },
    ]);

    expect(before.specialInstructions).toBe("Texto anterior");
    expect(after.specialInstructions).toBe("Texto nuevo");
  });
});

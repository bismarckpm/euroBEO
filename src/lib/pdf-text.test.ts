import { describe, expect, it } from "vitest";
import { extractPdfFragments } from "./pdf-text";

describe("extractPdfFragments", () => {
  it("rechaza un archivo que no es un PDF", async () => {
    await expect(extractPdfFragments(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(
      "El archivo no es un PDF válido.",
    );
  });
});

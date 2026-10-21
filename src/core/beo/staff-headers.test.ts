import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveBlockKind, seedBlockHeaderEntries } from "../config/block-headers";
import { assignPersonnel, personnelGroup, staffHeaderWords } from "./classify";

const caloxPath = path.join(process.cwd(), "fixtures", "golden", "scan-calox", "expected-cells.json");

type CaloxSection = {
  header: string;
  expectedStaffGroup?: string;
  items: { qty: number; description: string }[];
};

type CaloxCells = {
  days: {
    blocks: {
      title: string;
      expectedKind: "MONTAJE" | "EVENTO" | "DESMONTAJE";
      sections: CaloxSection[];
    }[];
  }[];
};

describe("palabras de montaje y desmontaje", () => {
  it("las busca completas y no cuenta desmontaje como montaje", () => {
    expect(staffHeaderWords("DESMONTAJE")).toEqual({ montaje: false, desmontaje: true });
    expect(staffHeaderWords("PERSONAL MONTAJE")).toEqual({ montaje: true, desmontaje: false });
    expect(staffHeaderWords("Personal para el servicio")).toEqual({
      montaje: false,
      desmontaje: false,
    });
    expect(staffHeaderWords("PERSONAL PARA EL MONTAJE - DESMONTAJE")).toEqual({
      montaje: true,
      desmontaje: true,
    });
  });
});

describe("encabezado mixto de personal", () => {
  const header = "PERSONAL PARA EL MONTAJE - DESMONTAJE";

  it("en un bloque de montaje queda en Montaje", () => {
    expect(assignPersonnel(header, "MONTAJE")).toEqual({ group: "Montaje", review: false });
  });

  it("en un bloque de desmontaje queda en Desmontaje", () => {
    expect(assignPersonnel(header, "DESMONTAJE")).toEqual({ group: "Desmontaje", review: false });
  });

  it("en un bloque de evento queda en Montaje para validar", () => {
    expect(assignPersonnel(header, "EVENTO")).toEqual({ group: "Montaje", review: true });
    expect(personnelGroup(header, "EVENTO")).toBe("Montaje");
  });
});

describe.skipIf(!existsSync(caloxPath))("presupuesto de Calox", () => {
  const cells = JSON.parse(readFileSync(caloxPath, "utf8")) as CaloxCells;
  const headers = seedBlockHeaderEntries();

  it("interpreta el bloque y el personal tal como están en el caso dorado", () => {
    const block = cells.days[0]?.blocks[0];
    expect(block).toBeDefined();
    if (!block) {
      return;
    }
    expect(resolveBlockKind(block.title, headers)).toBe(block.expectedKind);
    const staff = block.sections.find((section) => section.expectedStaffGroup);
    expect(staff?.items.length).toBeGreaterThan(0);
    expect(personnelGroup(staff?.header ?? "", block.expectedKind)).toBe(staff?.expectedStaffGroup);
    expect(assignPersonnel(staff?.header ?? "", block.expectedKind).review).toBe(false);
  });
});

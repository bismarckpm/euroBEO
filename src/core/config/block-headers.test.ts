import { describe, expect, it } from "vitest";
import { normalizeLabel } from "./normalize";
import { seedBlockHeaders } from "./seed-data";
import { resolveBlockKind, seedBlockHeaderEntries } from "./block-headers";

describe("variantes de encabezado de bloque", () => {
  const headers = seedBlockHeaderEntries();

  it("siembra las variantes de montaje y desmontaje", () => {
    expect(seedBlockHeaders.map((entry) => entry.header)).toEqual([
      "Día previo de montaje",
      "Día de montaje",
      "Montaje",
      "Desmontaje",
      "Día de desmontaje",
    ]);
    expect(seedBlockHeaders.map((entry) => entry.kind)).toEqual([
      "MONTAJE",
      "MONTAJE",
      "MONTAJE",
      "DESMONTAJE",
      "DESMONTAJE",
    ]);
  });

  it("reconoce el día previo de montaje y deja lo desconocido como evento", () => {
    expect(resolveBlockKind("Día previo de montaje", headers)).toBe("MONTAJE");
    expect(resolveBlockKind("DIA DE DESMONTAJE", headers)).toBe("DESMONTAJE");
    expect(resolveBlockKind("Montaje", headers)).toBe("MONTAJE");
    expect(resolveBlockKind("Jornada inaugural", headers)).toBe("EVENTO");
    expect(headers.some((header) => header.normalized === normalizeLabel("Día de montaje"))).toBe(
      true,
    );
  });
});

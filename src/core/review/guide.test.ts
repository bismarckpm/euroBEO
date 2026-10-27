import { describe, expect, it } from "vitest";
import {
  adjacentWizardStep,
  beoNeedsReview,
  describeGeneratedFile,
  entryWizardStep,
  firstBeoToReview,
  wizardSequence,
} from "./guide";

describe("guía de la revisión", () => {
  const porDefinir = {
    id: "por-definir",
    salon: "Por definir",
    date: "2026-11-04",
    kind: "MONTAJE",
    pendingCount: 1,
  };
  const plaza = {
    id: "plaza",
    salon: "Plaza Caracas - Venezuela",
    date: "2026-11-04",
    kind: "MONTAJE",
    pendingCount: 0,
  };

  it("marca Por definir y deja Plaza Caracas en cero sin señal", () => {
    expect(beoNeedsReview(porDefinir, [])).toBe(true);
    expect(beoNeedsReview(plaza, [])).toBe(false);
    expect(firstBeoToReview([plaza, porDefinir])).toBe("por-definir");
  });

  it("marca una B.E.O. en cero si tiene un error de validación", () => {
    const issues = [{ beo: "Plaza Caracas - Venezuela 2026-11-04" }];
    expect(beoNeedsReview(plaza, issues)).toBe(true);
  });

  it("describe cada archivo con evento, número, lugar, fecha y contenido", () => {
    expect(
      describeGeneratedFile({
        event: "Congreso",
        number: "0.001/26",
        kind: "beo",
        beo: { salon: "Diamante", date: "2026-10-22", kind: "MONTAJE" },
      }),
    ).toEqual({
      event: "Congreso",
      number: "0.001/26",
      salon: "Diamante",
      date: "22/10/2026",
      content: "montaje",
    });
    expect(
      describeGeneratedFile({
        event: "Congreso",
        number: "0.002/26",
        kind: "systems",
        beo: { salon: "Diamante", date: "2026-10-23", kind: "EVENTO" },
      }).content,
    ).toBe("sistemas");
    expect(
      describeGeneratedFile({
        event: "Congreso",
        number: "0.003/26",
        kind: "beo",
        beo: { salon: "Topacio", date: "2026-10-24", kind: "DESMONTAJE" },
      }).content,
    ).toBe("desmontaje");
    expect(
      describeGeneratedFile({
        event: "Congreso",
        number: "12",
        kind: "memo",
        beo: null,
      }),
    ).toEqual({
      event: "Congreso",
      number: "12",
      salon: "—",
      date: "—",
      content: "memorándum",
    });
  });

  it("Siguiente salta Plaza Caracas en cero y omite el memorándum en cero", () => {
    const input = {
      beos: [plaza, porDefinir],
      memos: [{ id: "memo-1", pendingCount: 0 }],
    };
    expect(wizardSequence(input).map((step) => step.kind)).toEqual([
      "datos",
      "beo",
      "beo",
      "generar",
      "archivos",
    ]);
    expect(adjacentWizardStep(input, { kind: "beo", id: plaza.id }, 1)).toEqual({
      kind: "beo",
      id: porDefinir.id,
    });
    expect(adjacentWizardStep(input, { kind: "beo", id: porDefinir.id }, 1)).toEqual({
      kind: "generar",
    });
  });

  it("abre generar si no falta nada y Topacio si es la pendiente", () => {
    const topacio = {
      id: "topacio",
      salon: "Topacio",
      date: "2026-10-22",
      kind: "EVENTO",
      pendingCount: 1,
    };
    expect(entryWizardStep({ beos: [plaza], memos: [{ id: "memo-1", pendingCount: 0 }] })).toEqual({
      kind: "generar",
    });
    expect(entryWizardStep({ beos: [plaza, topacio] })).toEqual({ kind: "beo", id: "topacio" });
  });
});

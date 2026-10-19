import { describe, expect, it, vi } from "vitest";
import { emptyClient, emptyHeader, tracked, type ParsedBudget } from "../budget/model";
import { BEO_SECTIONS } from "../config/sections";
import { normalizeBudget } from "./orchestrate";
import { withRetry, type NormalizationProvider } from "./provider";
import { promptFor, validateBlockFields, type ClosedCatalog } from "./schemas";

const catalog: ClosedCatalog = {
  salons: ["Diamante", "Topacio"],
  sections: BEO_SECTIONS,
  memoTypes: ["Tarifa de estacionamiento"],
  keywords: ["tarifa plana de estacionamiento"],
};

function budgetWith(salonRaw: string): ParsedBudget {
  return {
    header: emptyHeader(),
    client: { ...emptyClient(), company: "Droguería Nena", phones: "(0412) 5243150" },
    eventTitle: null,
    days: [
      {
        dates: ["2026-10-20"],
        raw: "20 de octubre de 2026",
        blocks: [
          {
            kind: "EVENTO",
            rawTitle: "EVENTO",
            salonRaw,
            salon: tracked(null, "PENDING"),
            schedule: tracked("Hora: 08:00 a 06:00 pm", "PENDING"),
            setup: tracked(null, "PENDING"),
            pax: tracked(null, "PENDING"),
            nights: null,
            rent: { regular: null, net: null, discountLabel: null, courtesy: false },
            sections: [
              {
                headerRaw: "Menú especial",
                target: tracked(null, "PENDING"),
                items: [
                  {
                    qty: 1,
                    description: "Servicio no catalogado",
                    nights: 0,
                    unitPrice: null,
                    total: null,
                    flags: [],
                    section: tracked(null, "PENDING"),
                  },
                ],
              },
            ],
            page: 1,
          },
        ],
      },
    ],
    totals: {
      subtotal: null,
      iva: null,
      logistics: null,
      general: null,
      igtf: null,
      payable: null,
    },
    benefits: ["Se otorga cortesía de salón"],
    triggers: [],
    warnings: [],
    structureErrors: [],
    reconciliation: { expected: null, actual: 0, difference: null, lines: [], ok: false },
  };
}

describe("validateBlockFields", () => {
  it("acepta un horario de 24 horas y descarta un salón fuera de catálogo", () => {
    const valid = validateBlockFields(
      {
        salonCandidates: ["Topacio"],
        scheduleStart: "08:00",
        scheduleEnd: "18:00",
        setupType: "Mesas redondas",
        pax: 120,
      },
      catalog,
    );
    expect(valid).toMatchObject({
      salon: "Topacio",
      scheduleStart: "08:00",
      scheduleEnd: "18:00",
      pax: 120,
    });

    const invalid = validateBlockFields(
      {
        salonCandidates: ["Salón inventado"],
        scheduleStart: "25:00",
        scheduleEnd: null,
        setupType: null,
        pax: 0,
      },
      catalog,
    );
    expect(invalid).toMatchObject({ salon: null, scheduleStart: null, pax: null });
  });

  it("incluye en el prompt solo el catálogo cerrado", () => {
    const prompt = promptFor("block_fields", catalog);
    expect(prompt).toContain("Diamante");
    expect(prompt).toContain("Topacio");
    expect(prompt).not.toContain("Droguería");
  });
});

describe("withRetry", () => {
  it("reintenta una vez y luego propaga el error", async () => {
    const run = vi.fn(async () => {
      throw new Error("red");
    });
    await expect(withRetry(run)).rejects.toThrow("red");
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("normalizeBudget", () => {
  it("aplica una normalización aprendida sin llamar a la IA", async () => {
    const provider: NormalizationProvider = { complete: vi.fn(async () => ({})) };
    const sample = budgetWith("SALON PLAZA CARACAS");
    const block = sample.days[0]?.blocks[0];
    if (!block) {
      throw new Error("falta el bloque");
    }
    block.schedule = tracked(null, "PENDING");
    block.sections[0]!.target = tracked("ALIMENTOS", "RULE");
    block.sections[0]!.items[0]!.section = tracked("ALIMENTOS", "RULE");
    sample.benefits = [];
    const result = await normalizeBudget(sample, {
      catalog,
      provider,
      findLearned: async (task, text) =>
        task === "block_fields" && text === "SALON PLAZA CARACAS" ? { salon: "Diamante" } : null,
    });

    expect(result.days[0]?.blocks[0]?.salon).toEqual({ value: "Diamante", status: "RULE" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("guarda el horario válido con estado IA", async () => {
    const provider: NormalizationProvider = {
      complete: async (request) => {
        if (request.task === "block_fields") {
          return {
            salonCandidates: ["Topacio"],
            scheduleStart: "08:00",
            scheduleEnd: "18:00",
            setupType: null,
            pax: null,
          };
        }
        return { target: null, memoTypeKey: null };
      },
    };
    const result = await normalizeBudget(budgetWith("Salón Topacio"), {
      catalog,
      provider,
      findLearned: async () => null,
    });
    const block = result.days[0]?.blocks[0];
    expect(block?.salon).toEqual({ value: "Topacio", status: "AI" });
    expect(block?.schedule).toEqual({ value: "08:00 a 18:00", status: "AI" });
  });

  it("deja el campo pendiente si el salón no está en el catálogo", async () => {
    const provider: NormalizationProvider = {
      complete: async () => ({
        salonCandidates: ["No existe"],
        scheduleStart: null,
        scheduleEnd: null,
        setupType: null,
        pax: null,
      }),
    };
    const result = await normalizeBudget(budgetWith("Salón raro"), {
      catalog,
      provider,
      findLearned: async () => null,
    });
    expect(result.days[0]?.blocks[0]?.salon.status).toBe("PENDING");
  });

  it("deja el campo pendiente si la red falla o no hay clave", async () => {
    const failing: NormalizationProvider = {
      complete: async () => {
        throw new Error("red");
      },
    };
    const failed = await normalizeBudget(budgetWith("Salón raro"), {
      catalog,
      provider: failing,
      findLearned: async () => null,
    });
    expect(failed.days[0]?.blocks[0]?.salon.status).toBe("PENDING");

    const disabled = await normalizeBudget(budgetWith("Salón raro"), {
      catalog,
      provider: null,
      findLearned: async () => null,
    });
    expect(disabled.days[0]?.blocks[0]?.salon.status).toBe("PENDING");
  });

  it("no envía el nombre del cliente al proveedor", async () => {
    const seen: string[] = [];
    const provider: NormalizationProvider = {
      complete: async (request) => {
        seen.push(request.fragment);
        return {
          salonCandidates: [],
          scheduleStart: null,
          scheduleEnd: null,
          setupType: null,
          pax: null,
        };
      },
    };
    await normalizeBudget(budgetWith("Droguería Nena en el salón"), {
      catalog,
      provider,
      findLearned: async () => null,
    });
    expect(seen.some((fragment) => fragment.includes("Droguería Nena"))).toBe(false);
    expect(seen.some((fragment) => fragment.includes("5243150"))).toBe(false);
  });
});

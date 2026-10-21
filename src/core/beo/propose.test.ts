import { describe, expect, it } from "vitest";
import { currentFixedTexts } from "../config/fixed-texts";
import { seedFixedTexts } from "../config/seed-data";
import {
  emptyClient,
  emptyHeader,
  tracked,
  type BudgetBlock,
  type BudgetItem,
  type ParsedBudget,
} from "../budget/model";
import { splitCents } from "./format";
import { proposeBeos } from "./propose";

const texts = currentFixedTexts(seedFixedTexts);

function item(partial: Partial<BudgetItem> & Pick<BudgetItem, "qty" | "description">): BudgetItem {
  return {
    nights: 1,
    unitPrice: null,
    total: null,
    flags: [],
    section: tracked("PERSONAL", "RULE"),
    ...partial,
  };
}

function block(partial: Partial<BudgetBlock> & Pick<BudgetBlock, "kind">): BudgetBlock {
  return {
    rawTitle: partial.kind,
    salonRaw: "Zafiro",
    salon: tracked("Zafiro", "RULE"),
    schedule: tracked(null, "PENDING"),
    setup: tracked(null, "PENDING"),
    pax: tracked(null, "PENDING"),
    nights: 1,
    rent: { regular: null, net: null, discountLabel: null, courtesy: false },
    sections: [],
    page: 1,
    ...partial,
  };
}

function budget(days: ParsedBudget["days"], title = "CONGRESO NACIONAL"): ParsedBudget {
  return {
    header: emptyHeader(),
    client: { ...emptyClient(), company: "ACME", contact: "Ana", phones: "04120000000" },
    eventTitle: title,
    days,
    totals: { subtotal: null, iva: null, logistics: null, general: null, igtf: null, payable: null },
    benefits: [],
    triggers: [],
    warnings: [],
    structureErrors: [],
    reconciliation: { expected: null, actual: 0, difference: null, lines: [], ok: true },
  };
}

describe("clasificación frente a la IA", () => {
  it("no acepta la sección de la IA si el respaldo de CENA CONFERENCIA aplica", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-23"],
          raw: "23",
          blocks: [
            block({
              kind: "EVENTO",
              pax: tracked(10, "RULE"),
              sections: [
                {
                  headerRaw: "CENA CONFERENCIA",
                  target: tracked(null, "PENDING"),
                  items: [
                    item({
                      qty: 10,
                      description: "Tablas de embutidos por persona",
                      unitPrice: 2516,
                      section: tracked("SISTEMAS", "AI"),
                    }),
                  ],
                },
              ],
            }),
          ],
        },
      ]),
      texts,
    );
    expect(drafts[0]?.food.map((line) => line.section)).toEqual(["ALIMENTOS"]);
    expect(drafts[0]?.sections.some((section) => section.section === "SISTEMAS")).toBe(false);
  });
});

describe("reparto de la propuesta", () => {
  it("deja el residuo de céntimos en el último día", () => {
    expect(splitCents(100, 3)).toEqual([33, 33, 34]);
  });

  it("expande un bloque de dos fechas y divide la renta neta", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-23", "2026-10-24"],
          raw: "23 y 24",
          blocks: [block({ kind: "EVENTO", salon: tracked("Topacio", "RULE"), salonRaw: "Topacio", pax: tracked(120, "RULE"), rent: { regular: 450000, net: 585000, discountLabel: "35%", courtesy: false } })],
        },
      ]),
      texts,
    );
    expect(drafts).toHaveLength(2);
    expect(drafts.map((draft) => draft.rentCents.value)).toEqual([292500, 292500]);
    expect(drafts[0]?.guarantee.value).toBe(120);
    expect(drafts[0]?.formattedDate.value).toBe("23.10.2026");
    expect(drafts[0]?.weekday.value).toBe("Viernes");
  });

  it("separa el montaje de otro día y une el del mismo día", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-22"],
          raw: "22",
          blocks: [block({ kind: "MONTAJE", rent: { regular: 420000, net: null, discountLabel: null, courtesy: true } })],
        },
        {
          dates: ["2026-10-23"],
          raw: "23",
          blocks: [
            block({ kind: "MONTAJE", sections: [{ headerRaw: "PERSONAL MONTAJE", target: tracked("PERSONAL", "RULE"), items: [item({ qty: 2, description: "Supervisor", unitPrice: 4500 })] }] }),
            block({ kind: "EVENTO", pax: tracked(80, "RULE"), rent: { regular: 100000, net: 100000, discountLabel: null, courtesy: false } }),
          ],
        },
      ]),
      texts,
    );
    expect(drafts.map((draft) => `${draft.formattedDate.value} ${draft.kind}`)).toEqual([
      "22.10.2026 MONTAJE",
      "23.10.2026 EVENTO",
    ]);
    expect(drafts[0]?.guarantee.value).toBeNull();
    expect(drafts[0]?.rentCents.value).toBeNull();
    const personnel = drafts[1]?.sections.find((section) => section.section === "PERSONAL");
    expect(personnel?.groups.map((group) => group.name)).toEqual(["Montaje"]);
  });

  it("deja en Montaje, para validar, el personal mixto de un bloque de evento", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-22"],
          raw: "22",
          blocks: [
            block({
              kind: "EVENTO",
              sections: [
                {
                  headerRaw: "PERSONAL PARA EL MONTAJE - DESMONTAJE",
                  target: tracked("PERSONAL", "RULE"),
                  items: [item({ qty: 1, description: "Supervisor", unitPrice: 5850 })],
                },
              ],
            }),
          ],
        },
      ]),
      texts,
    );
    const group = drafts[0]?.sections
      .find((section) => section.section === "PERSONAL")
      ?.groups.find((entry) => entry.name === "Montaje");
    expect(group?.lines).toHaveLength(1);
    expect(group?.lines[0]?.status).toBe("REVIEW");
  });

  it("crea una B.E.O. de desmontaje cuando el día no tiene evento", () => {
    const drafts = proposeBeos(
      budget([{ dates: ["2026-10-17"], raw: "17", blocks: [block({ kind: "DESMONTAJE", salon: tracked("Plaza Real", "RULE"), salonRaw: "Plaza Real" })] }]),
      texts,
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.kind).toBe("DESMONTAJE");
    expect(drafts[0]?.eventType.value).toBe("Desmontaje");
  });

  it("asigna el desmontaje de todos los salones al último salón del día", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-22"],
          raw: "22",
          blocks: [
            block({ kind: "EVENTO", salon: tracked("Plaza Real", "RULE"), salonRaw: "Plaza Real" }),
            block({ kind: "EVENTO", salon: tracked("Diamante", "RULE"), salonRaw: "Diamante" }),
            block({
              kind: "DESMONTAJE",
              salon: tracked(null, "PENDING"),
              salonRaw: "todos los salones",
              sections: [{ headerRaw: "PERSONAL DESMONTAJE", target: tracked("PERSONAL", "RULE"), items: [item({ qty: 1, description: "Supervisor", unitPrice: 10800 })] }],
            }),
          ],
        },
      ]),
      texts,
    );
    expect(drafts.map((draft) => draft.salon)).toEqual(["Plaza Real", "Diamante"]);
    const diamante = drafts[1];
    expect(diamante?.needsReview).toBe(true);
    expect(diamante?.salonName.status).toBe("REVIEW");
    expect(diamante?.sections.find((section) => section.section === "PERSONAL")?.groups[0]?.name).toBe("Desmontaje");
  });

  it("mantiene los salones combinados en una sola B.E.O.", () => {
    const drafts = proposeBeos(
      budget([
        {
          dates: ["2026-10-01"],
          raw: "01",
          blocks: [block({ kind: "EVENTO", salon: tracked("Turmalina - Ópalo", "RULE"), salonRaw: "Turmalina - Opalo" })],
        },
      ]),
      texts,
    );
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.salonName.value).toBe("Turmalina - Ópalo");
  });
});

describe("campos de la propuesta", () => {
  it("formatea personal, alimentos, sistemas y textos fijos", () => {
    const drafts = proposeBeos(
      budget(
        [
          {
            dates: ["2026-10-07"],
            raw: "07",
            blocks: [
              block({
                kind: "EVENTO",
                salon: tracked("Salón Plaza Real", "RULE"),
                salonRaw: "Salón Plaza Real",
                pax: tracked(700, "RULE"),
                schedule: tracked("06:00 pm a 11:00 pm", "RULE"),
                setup: tracked("Imperial", "RULE"),
                rent: { regular: 950000, net: 741500, discountLabel: null, courtesy: false },
                sections: [
                  {
                    headerRaw: "ALIMENTOS Y BEBIDAS",
                    target: tracked("ALIMENTOS", "RULE"),
                    items: [item({ qty: 700, description: "Cena de gala", unitPrice: 400, section: tracked("ALIMENTOS", "RULE") })],
                  },
                  {
                    headerRaw: "PERSONAL EVENTO",
                    target: tracked("PERSONAL", "RULE"),
                    items: [item({ qty: 8, description: "Asistente de Servicio", unitPrice: 3900 })],
                  },
                  {
                    headerRaw: "SISTEMAS",
                    target: tracked("SISTEMAS", "AI"),
                    items: [item({ qty: 1, description: "Internet dedicado", unitPrice: 15000, section: tracked("SISTEMAS", "AI") })],
                  },
                ],
              }),
            ],
          },
        ],
        "CENA DE GALA",
      ),
      texts,
    );
    const draft = drafts[0];
    expect(draft?.salonName.value).toBe("Plaza Real");
    expect(draft?.eventType.value).toBe("Cena");
    expect(draft?.billboard).toMatchObject({ value: "CENA DE GALA", status: "PENDING" });
    expect(draft?.rentCents.value).toBe(741500);
    expect(draft?.food[0]?.text).toContain("N° pax: 700");
    expect(draft?.food[0]?.text).toContain("Precio: USD 4,00 c/u x pax");
    const personal = draft?.sections.find((section) => section.section === "PERSONAL")?.groups[0]?.lines[0];
    expect(personal?.text).toBe("08 Asistente de Servicio USD 39,00 c/u");
    expect(draft?.sections.some((section) => section.section === "SISTEMAS")).toBe(true);
    expect(draft?.specialInstructions.value).toContain("NO TIENEN CRÉDITO CON EL HOTEL");
    expect(draft?.servicePreparation.value).toContain("30 minutos");
    expect(draft?.setup.value).toBe("Imperial");
  });
});

import { z } from "zod";

const status = z.enum(["RULE", "AI", "PENDING", "ABSENT"]);

function tracked<T extends z.ZodType>(value: T) {
  return z.object({ value, status });
}

const itemSchema = z.object({
  qty: z.number().int(),
  description: z.string(),
  nights: z.number().int(),
  unitPrice: z.number().int().nullable(),
  total: z.number().int().nullable(),
  flags: z.array(z.string()),
  section: tracked(z.string().nullable()),
});

const sectionSchema = z.object({
  headerRaw: z.string(),
  target: tracked(z.string().nullable()),
  items: z.array(itemSchema),
});

const blockSchema = z.object({
  kind: z.enum(["MONTAJE", "EVENTO", "DESMONTAJE", "OTRO"]),
  rawTitle: z.string(),
  salonRaw: z.string().nullable(),
  salon: tracked(z.string().nullable()),
  schedule: tracked(z.string().nullable()),
  setup: tracked(z.string().nullable()),
  pax: tracked(z.number().int().nullable()),
  nights: z.number().int().nullable(),
  rent: z.object({
    regular: z.number().int().nullable(),
    net: z.number().int().nullable(),
    discountLabel: z.string().nullable(),
    courtesy: z.boolean(),
  }),
  sections: z.array(sectionSchema),
  page: z.number().int(),
});

export const parsedBudgetSchema = z.object({
  header: z.object({
    locator: z.string().nullable(),
    issuedOn: z.string().nullable(),
    checkIn: z.string().nullable(),
    checkOut: z.string().nullable(),
    executive: z.string().nullable(),
    role: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  client: z.object({
    company: z.string().nullable(),
    contact: z.string().nullable(),
    phones: z.string().nullable(),
    address: z.string().nullable(),
    email: z.string().nullable(),
    rif: z.string().nullable(),
  }),
  eventTitle: z.string().nullable(),
  days: z.array(
    z.object({
      dates: z.array(z.string()),
      raw: z.string(),
      blocks: z.array(blockSchema),
    }),
  ),
  totals: z.object({
    subtotal: z.number().int().nullable(),
    iva: z.number().int().nullable(),
    logistics: z.number().int().nullable(),
    general: z.number().int().nullable(),
    igtf: z.number().int().nullable(),
    payable: z.number().int().nullable(),
  }),
  benefits: z.array(z.string()),
  triggers: z.array(z.string()),
  warnings: z.array(z.string()),
  structureErrors: z.array(
    z.object({
      page: z.number().int(),
      section: z.string(),
      message: z.string(),
    }),
  ),
  reconciliation: z.object({
    expected: z.number().int().nullable(),
    actual: z.number().int(),
    difference: z.number().int().nullable(),
    lines: z.array(z.object({ description: z.string(), total: z.number().int() })),
    ok: z.boolean(),
  }),
  origin: z.enum(["digital", "scan"]).default("digital"),
  arithmetic: z
    .array(
      z.object({
        equation: z.enum(["row", "subtotal", "iva", "total", "igtf"]),
        cell: z.string(),
        printed: z.number().int(),
        calculated: z.number().int(),
        difference: z.number().int(),
        message: z.string(),
        reviewed: z.boolean(),
      }),
    )
    .default([]),
});

export type ParsedBudgetOutput = z.infer<typeof parsedBudgetSchema>;

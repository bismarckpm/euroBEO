export const FIXED_TEXT_KEYS = [
  "special_instructions",
  "service_preparation",
  "footer_initials",
  "beo_presentation",
  "event_types",
] as const;

export type FixedTextKey = (typeof FIXED_TEXT_KEYS)[number];

export type FixedTexts = {
  specialInstructions: string;
  servicePreparation: string;
  footerInitials: string;
};

/** Siempre devuelve el cuerpo vigente de cada texto fijo. */
export function currentFixedTexts(rows: { key: string; body: string }[]): FixedTexts {
  const byKey = new Map(rows.map((row) => [row.key, row.body]));
  return {
    specialInstructions: byKey.get("special_instructions") ?? "",
    servicePreparation: byKey.get("service_preparation") ?? "",
    footerInitials: byKey.get("footer_initials") ?? "",
  };
}

export function isFixedTextKey(value: string): value is FixedTextKey {
  return (FIXED_TEXT_KEYS as readonly string[]).includes(value);
}

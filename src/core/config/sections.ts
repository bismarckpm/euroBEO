/** Secciones destino de la B.E.O. La plantilla decide dónde se imprime cada una. */
export const BEO_SECTIONS = [
  "ALIMENTOS",
  "BEBIDAS",
  "ACCESOS",
  "DESCORCHE",
  "SISTEMAS",
  "MOBILIARIO",
  "ELECTRICIDAD",
  "PERSONAL",
  "EXCLUIR",
] as const;

export type BeoSection = (typeof BEO_SECTIONS)[number];

export const SECTION_LABELS: Record<BeoSection, string> = {
  ALIMENTOS: "Alimentos",
  BEBIDAS: "Bebidas",
  ACCESOS: "Accesos",
  DESCORCHE: "Descorche",
  SISTEMAS: "Sistemas",
  MOBILIARIO: "Mobiliario",
  ELECTRICIDAD: "Electricidad",
  PERSONAL: "Personal",
  EXCLUIR: "Excluir",
};

export function isBeoSection(value: string): value is BeoSection {
  return (BEO_SECTIONS as readonly string[]).includes(value);
}

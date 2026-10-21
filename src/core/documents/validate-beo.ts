import { looksLikeFood } from "../beo/classify";
import type { BeoTemplateData } from "./beo-template-data";

export type BeoIssue = {
  beo: string;
  field: string;
  message: string;
};

type CheckedLine = {
  section: string;
  groupName: string;
  description: string;
  unitPriceCents: number | null;
  text: string;
};

function itemName(description: string): string {
  return description.split("\n")[0]?.trim() || "ítem";
}

/** Errores por B.E.O. y campo. Pendiente no es una sección imprimible. */
export function validateBeoLines(label: string, lines: CheckedLine[]): BeoIssue[] {
  const issues: BeoIssue[] = [];
  const foods = lines.filter((line) => line.section === "ALIMENTOS");
  for (const line of lines) {
    const name = itemName(line.description);
    if (!line.section.trim()) {
      issues.push({
        beo: label,
        field: name,
        message: `Falta clasificar «${name}» en ${label}.`,
      });
    }
    if (line.section === "ALIMENTOS" && line.unitPriceCents === null) {
      issues.push({
        beo: label,
        field: name,
        message: `El alimento «${name}» de ${label} no tiene precio.`,
      });
    }
    if (line.section === "PERSONAL" && !line.groupName.trim()) {
      issues.push({
        beo: label,
        field: name,
        message: `El personal «${name}» de ${label} no tiene subgrupo.`,
      });
    }
  }
  const foodLeftBehind = lines.some(
    (line) =>
      looksLikeFood(line.description) && line.section !== "BEBIDAS" && line.section !== "DESCORCHE",
  );
  if (foods.length === 0 && foodLeftBehind) {
    issues.push({
      beo: label,
      field: "Alimentos y Bebidas",
      message: `Hay alimentos en ${label} pero la sección Alimentos y Bebidas está vacía.`,
    });
  }
  return issues;
}

/** El botón Confirmar y generar usa este estado. Los mensajes nombran ítem y B.E.O. */
export function generateButtonState(input: { pendingCount: number; issues: BeoIssue[] }): {
  disabled: boolean;
  messages: string[];
} {
  return {
    disabled: input.pendingCount > 0 || input.issues.length > 0,
    messages: input.issues.map((issue) => issue.message),
  };
}

export function validatePrintable(label: string, data: BeoTemplateData): BeoIssue[] {
  const texts = [
    ...data.foodItems.flatMap((item) => [item.title, ...item.lines, item.includes ?? "", item.note ?? ""]),
    ...data.rightSections.flatMap((section) => [section.title, ...section.lines]),
    ...data.staff.setup,
    ...data.staff.service,
    ...data.staff.teardown,
    data.evento,
    data.eventoTipo,
    data.cartelera,
    data.montaje,
  ];
  return texts
    .filter((text) => /\bpendiente\b/i.test(text))
    .map((text) => ({
      beo: label,
      field: text.slice(0, 80),
      message: `${label} no puede imprimir el estado Pendiente.`,
    }));
}

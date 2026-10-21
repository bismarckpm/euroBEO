import type { BlockKind } from "../budget/model";
import type { BeoKind } from "./model";
import type { EventTypeEntry } from "./presentation";

export type PersonnelGroup = "Montaje" | "Evento" | "Desmontaje";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Comida o consumo por persona, para el respaldo de encabezados desconocidos. */
export function looksLikeFood(description: string): boolean {
  const text = fold(description);
  return (
    text.includes("por persona") ||
    /\bp\/p\b/.test(text) ||
    text.includes("incluye") ||
    text.includes("pasapalo") ||
    text.includes("embutid") ||
    text.includes("tequeno") ||
    text.includes("jamon") ||
    text.includes("queso") ||
    /\bcata\b/.test(text)
  );
}

function fallbackSection(description: string): string | null {
  const text = fold(description);
  if (text.includes("descorche")) {
    return "DESCORCHE";
  }
  if (text.includes("agua") || text.includes("bebida") || text.includes("refresco")) {
    return "BEBIDAS";
  }
  if (looksLikeFood(description)) {
    return "ALIMENTOS";
  }
  return null;
}

/**
 * Catálogo, encabezado, respaldo de alimentos y bebidas, IA y, al final, Pendiente.
 * La sección de la IA solo se acepta si el respaldo no aplica.
 * `null` es Pendiente: un estado, no una sección imprimible.
 */
export function classifyItem(input: {
  description: string;
  headerSection: string | null;
  catalogSection: string | null;
  aiSection?: string | null;
}): { section: string | null; review: boolean } {
  if (input.catalogSection) {
    return { section: input.catalogSection, review: false };
  }
  if (input.headerSection) {
    return { section: input.headerSection, review: false };
  }
  const fallback = fallbackSection(input.description);
  if (fallback) {
    return { section: fallback, review: true };
  }
  if (input.aiSection) {
    return { section: input.aiSection, review: true };
  }
  return { section: null, review: false };
}

export type PersonnelAssignment = {
  group: PersonnelGroup;
  /** El personal quedó en Montaje, pero la asistente tiene que confirmarlo. */
  review: boolean;
};

/** "montaje" y "desmontaje" como palabras completas. "desmontaje" no cuenta como "montaje". */
export function staffHeaderWords(header: string): { montaje: boolean; desmontaje: boolean } {
  const name = fold(header);
  return {
    montaje: /\bmontaje\b/.test(name),
    desmontaje: /\bdesmontaje\b/.test(name),
  };
}

/**
 * El encabezado decide. Si nombra montaje y desmontaje a la vez, decide el tipo de bloque.
 * En un bloque de evento ese personal queda en Montaje para validar.
 */
export function assignPersonnel(header: string, blockKind: BlockKind): PersonnelAssignment {
  const name = fold(header);
  const words = staffHeaderWords(header);
  if (words.montaje && words.desmontaje) {
    if (blockKind === "DESMONTAJE") {
      return { group: "Desmontaje", review: false };
    }
    if (blockKind === "MONTAJE") {
      return { group: "Montaje", review: false };
    }
    return { group: "Montaje", review: true };
  }
  if (words.desmontaje) {
    return { group: "Desmontaje", review: false };
  }
  if (words.montaje) {
    return { group: "Montaje", review: false };
  }
  if (name.includes("personal") || name.includes("servicio")) {
    return { group: "Evento", review: false };
  }
  if (blockKind === "DESMONTAJE") {
    return { group: "Desmontaje", review: false };
  }
  if (blockKind === "MONTAJE") {
    return { group: "Montaje", review: false };
  }
  return { group: "Evento", review: false };
}

/** El encabezado decide. El tipo de bloque solo entra si el encabezado no dice nada. */
export function personnelGroup(header: string, blockKind: BlockKind): PersonnelGroup {
  return assignPersonnel(header, blockKind).group;
}

/** Columna EVENTO: montaje o desmontaje solo si la B.E.O. no tiene servicio ni alimentos. */
export function eventColumn(input: {
  title: string;
  kind: BeoKind;
  hasFood: boolean;
  hasServiceStaff: boolean;
  types: EventTypeEntry[];
}): string {
  if (!input.hasFood && !input.hasServiceStaff) {
    if (input.kind === "DESMONTAJE") {
      return "Desmontaje";
    }
    if (input.kind === "MONTAJE") {
      return "Montaje";
    }
  }
  const title = fold(input.title);
  for (const type of input.types) {
    if (type.keywords.some((keyword) => keyword.length > 0 && title.includes(fold(keyword)))) {
      return type.label;
    }
  }
  return "Evento";
}

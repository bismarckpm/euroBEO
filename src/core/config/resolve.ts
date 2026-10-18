import type { BeoSection } from "./sections";
import { normalizeLabel } from "./normalize";

export type SalonCatalogEntry = {
  id: string;
  name: string;
  aliases: { normalized: string }[];
};

export type SalonResolution =
  { status: "resolved"; salonId: string; name: string } | { status: "unresolved" };

export type SectionMappingEntry = {
  normalized: string;
  section: BeoSection;
};

export type SectionResolution =
  { status: "resolved"; section: BeoSection } | { status: "unresolved" };

export type CatalogItemEntry = {
  normalized: string;
  section: BeoSection;
};

/** Resuelve un texto de salón al nombre oficial, o lo deja sin resolver. */
export function resolveSalonText(text: string, salons: SalonCatalogEntry[]): SalonResolution {
  const normalized = normalizeLabel(text);
  if (!normalized) {
    return { status: "unresolved" };
  }

  for (const salon of salons) {
    if (salon.aliases.some((alias) => alias.normalized === normalized)) {
      return { status: "resolved", salonId: salon.id, name: salon.name };
    }
  }

  const byName = salons.filter((salon) => normalizeLabel(salon.name) === normalized);
  if (byName.length === 1) {
    return { status: "resolved", salonId: byName[0].id, name: byName[0].name };
  }
  return { status: "unresolved" };
}

/** Resuelve un encabezado de presupuesto a su sección destino. */
export function resolveSectionHeader(
  header: string,
  mappings: SectionMappingEntry[],
): SectionResolution {
  const normalized = normalizeLabel(header);
  const match = mappings.find((mapping) => mapping.normalized === normalized);
  if (!match) {
    return { status: "unresolved" };
  }
  return { status: "resolved", section: match.section };
}

/**
 * Clasifica un ítem. El catálogo gana cuando el encabezado no basta,
 * salvo que la sección ya esté excluida.
 */
export function classifyCatalogItem(
  description: string,
  section: BeoSection,
  items: CatalogItemEntry[],
): BeoSection {
  if (section === "EXCLUIR") {
    return "EXCLUIR";
  }
  const normalized = normalizeLabel(description);
  const match = items.find((item) => item.normalized === normalized);
  return match?.section ?? section;
}

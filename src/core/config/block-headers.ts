import type { BlockKind } from "../budget/model";
import { normalizeLabel } from "./normalize";
import { seedBlockHeaders } from "./seed-data";

/** Destino de un encabezado de bloque dentro del mapeo de configuración. */
export const BLOCK_HEADER_KINDS = ["MONTAJE", "EVENTO", "DESMONTAJE"] as const;

export type BlockHeaderKind = (typeof BLOCK_HEADER_KINDS)[number];

export const BLOCK_HEADER_LABELS: Record<BlockHeaderKind, string> = {
  MONTAJE: "Bloque: montaje",
  EVENTO: "Bloque: evento",
  DESMONTAJE: "Bloque: desmontaje",
};

export type BlockHeaderEntry = {
  normalized: string;
  kind: BlockHeaderKind;
};

export function isBlockHeaderKind(value: string): value is BlockHeaderKind {
  return (BLOCK_HEADER_KINDS as readonly string[]).includes(value);
}

/** Variantes semilla, listas para el parser cuando el catálogo no trae las suyas. */
export function seedBlockHeaderEntries(): BlockHeaderEntry[] {
  return seedBlockHeaders.map((entry) => ({
    normalized: normalizeLabel(entry.header),
    kind: entry.kind,
  }));
}

/**
 * Tipo de bloque a partir de las variantes configuradas.
 * Un encabezado que no coincide se interpreta como evento.
 * "setup" y "disassembly" conservan el respaldo de las plantillas en inglés.
 */
export function resolveBlockKind(title: string, headers: BlockHeaderEntry[]): BlockKind {
  const name = normalizeLabel(title);
  const match = headers.find((header) => header.normalized === name);
  if (match) {
    return match.kind;
  }
  if (/\b(desmontaje|disassembly)\b/.test(name)) {
    return "DESMONTAJE";
  }
  if (/\b(montaje|setup)\b/.test(name)) {
    return "MONTAJE";
  }
  return "EVENTO";
}

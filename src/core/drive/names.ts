export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF_MIME = "application/pdf";

const CARACAS = "America/Caracas";

/** Año de la carpeta de archivo, en hora de Caracas. */
export function driveYear(date: Date): string {
  const year = new Intl.DateTimeFormat("en-US", { timeZone: CARACAS, year: "numeric" }).format(
    date,
  );
  if (!/^\d{4}$/.test(year)) {
    throw new Error("No se pudo determinar el año de la carpeta.");
  }
  return year;
}

/**
 * Nombre libre en la carpeta. Si el nombre base ya existe, usa el siguiente
 * sufijo `v2`, `v3`… sin reutilizar ni sustituir un nombre ocupado.
 */
export function nextVersionedName(existingNames: readonly string[], fileName: string): string {
  const taken = new Set(existingNames);
  if (!taken.has(fileName)) {
    return fileName;
  }
  const match = /^(.*?)(\.[^.]+)$/.exec(fileName);
  const base = match?.[1] ?? fileName;
  const extension = match?.[2] ?? "";
  for (let version = 2; version < 1000; version += 1) {
    const candidate = `${base} v${version}${extension}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("No hay un sufijo de versión libre.");
}

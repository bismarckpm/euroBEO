/**
 * Clave de comparación de salones, secciones e ítems:
 * minúsculas, sin acentos, sin la palabra "salón" y con espacios colapsados.
 */
export function normalizeLabel(value: string): string {
  const withoutAccents = value.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutAccents
    .toLowerCase()
    .replace(/\bsalon\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

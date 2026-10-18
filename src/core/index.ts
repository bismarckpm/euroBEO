/**
 * Dominio de la aplicación. Los módulos de este árbol no dependen de Next.js
 * y se prueban con Vitest sin levantar el servidor ni la base de datos.
 */
export const domainModules = [
  "budget",
  "normalization",
  "beo",
  "memo",
  "documents",
  "drive",
  "config",
] as const;

import { defaultEventTypes } from "../beo/presentation";
import type { BeoSection } from "./sections";

/**
 * Salones observados en los ejemplos del diseño y alias que no coinciden
 * con el nombre oficial después de normalizar.
 * "SALON PLAZA CARACAS" queda cubierto por el alias "Plaza Caracas".
 */
export const seedSalons: { name: string; aliases: string[] }[] = [
  { name: "Plaza Real", aliases: ["Plaza Real A y B", "Plaza Real A", "Plaza Real B"] },
  { name: "Plaza Venezuela", aliases: [] },
  { name: "Diamante", aliases: ["Plaza Caracas"] },
  { name: "Zafiro", aliases: [] },
  { name: "Topacio", aliases: [] },
  { name: "Turmalina", aliases: [] },
  { name: "Ópalo", aliases: [] },
  { name: "Costa Dorada", aliases: [] },
  { name: "Cassandra", aliases: [] },
  { name: "Turmalina - Ópalo", aliases: ["Opalo-Turmalina"] },
];

/** Encabezados de bloque. El destino es el tipo de bloque, no una sección de la B.E.O. */
export const seedBlockHeaders: { header: string; kind: "MONTAJE" | "EVENTO" | "DESMONTAJE" }[] = [
  { header: "Día previo de montaje", kind: "MONTAJE" },
  { header: "Día de montaje", kind: "MONTAJE" },
  { header: "Montaje", kind: "MONTAJE" },
  { header: "Desmontaje", kind: "DESMONTAJE" },
  { header: "Día de desmontaje", kind: "DESMONTAJE" },
];

export const seedSectionMappings: { header: string; section: BeoSection }[] = [
  { header: "PERSONAL", section: "PERSONAL" },
  { header: "PERSONAL MONTAJE", section: "PERSONAL" },
  { header: "PERSONAL EVENTO", section: "PERSONAL" },
  { header: "PERSONAL PARA EL SERVICIO", section: "PERSONAL" },
  { header: "PERSONAL PARA EL SERVICIO DE COMIDAS", section: "PERSONAL" },
  { header: "ALIMENTOS", section: "ALIMENTOS" },
  { header: "ALIMENTOS Y BEBIDAS", section: "ALIMENTOS" },
  { header: "CENA CONFERENCIA", section: "ALIMENTOS" },
  { header: "CATA", section: "ALIMENTOS" },
  { header: "CENA", section: "ALIMENTOS" },
  { header: "BEBIDAS", section: "BEBIDAS" },
  { header: "SISTEMAS", section: "SISTEMAS" },
  { header: "DESCORCHE", section: "DESCORCHE" },
  { header: "ACCESO", section: "ACCESOS" },
  { header: "ACCESOS", section: "ACCESOS" },
  { header: "MOBILIARIO", section: "MOBILIARIO" },
  { header: "ELECTRICIDAD", section: "ELECTRICIDAD" },
  { header: "HABITACIÓN", section: "EXCLUIR" },
];

export const seedCatalogItems: { description: string; category: string; section: BeoSection }[] = [
  { description: "Personal", category: "Personal", section: "PERSONAL" },
  { description: "Supervisor", category: "Personal", section: "PERSONAL" },
  { description: "Limpiador / Acomodador", category: "Personal", section: "PERSONAL" },
  { description: "Oficial de seguridad", category: "Personal", section: "PERSONAL" },
  { description: "Filtros de agua", category: "Bebidas", section: "BEBIDAS" },
  { description: "Refrescos", category: "Bebidas", section: "BEBIDAS" },
  { description: "Agua mineral", category: "Bebidas", section: "BEBIDAS" },
  { description: "Descorche de Vino o Espumante", category: "Descorche", section: "DESCORCHE" },
  { description: "Tablas de embutidos por persona", category: "Alimentos", section: "ALIMENTOS" },
  { description: "Pasapalos 1p/p", category: "Alimentos", section: "ALIMENTOS" },
  { description: "Cata", category: "Alimentos", section: "ALIMENTOS" },
  { description: "Internet", category: "Sistemas", section: "SISTEMAS" },
  { description: "Mesas cocteleras", category: "Mobiliario", section: "MOBILIARIO" },
];

/**
 * Textos que se repiten en las B.E.O. de fixtures/beo.
 * Las iniciales JG/AR son las del pie de las órdenes principales;
 * las de internet usan JG/AP y se pueden cambiar en la pantalla.
 */
export const seedFixedTexts: { key: string; label: string; body: string }[] = [
  {
    key: "special_instructions",
    label: "Instrucciones especiales",
    body: "Agregar Impuestos Gubernamentales Vigentes\nNO TIENEN CRÉDITO CON EL HOTEL\nCargar al PM del Evento",
  },
  {
    key: "service_preparation",
    label: "Frase de preparación del servicio",
    body: "Por Favor estar preparado para el servicio 30 minutos o antes",
  },
  {
    key: "footer_initials",
    label: "Iniciales del pie",
    body: "JG/AR",
  },
  {
    key: "beo_presentation",
    label: "Presentación de la B.E.O.",
    body: JSON.stringify({
      eventHeaderSource: "client",
      dateFormat: "dd/mm/yy",
      uppercaseDayAndContact: true,
      setupLabel: "Montaje:",
      serviceLabel: "Servicio Evento:",
      teardownLabel: "Desmontaje:",
      tableCalculation: true,
    }),
  },
  {
    key: "event_types",
    label: "Tipos de evento",
    body: JSON.stringify(defaultEventTypes),
  },
];

/**
 * Memos 75 y 82, y el mismo cuerpo en los memos 88, 89 y 91.
 * Los días, el evento y los salones quedan como variables.
 */
export const seedMemoType = {
  name: "Tarifa de estacionamiento",
  recipient: "Sra. Milbia Pérez",
  company: "Servicios Parking 2015 C.A.",
  reference: "Tarifa de estacionamiento",
  body: "Por medio de la presente se le informa que los días {dias} se llevará a cabo el evento {evento} en el salón {salones} para el cual fue solicitada tarifa plana.\n\nLos tickets serán sellados por el cliente y pagados por cada participante.\n\nLos tickets del estacionamiento que entran dentro de la tarifa especial son los del estacionamiento (sótano). Esto no incluye el servicio de Valet Parking.\n\nDe antemano gracias por su colaboración Atentamente,",
  keywords: ["tarifa plana de estacionamiento"],
  templateFile: "templates/memo-estacionamiento.docx",
  excludeSetupDays: true,
};

export const seedSequence = {
  key: "beo",
  lastNumber: 0,
  year: 26,
};

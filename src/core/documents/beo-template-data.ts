import { z } from "zod";
import { formatCents } from "../beo/format";
import type { BeoDraft } from "../beo/model";
import { parseBeoNumber } from "../config/sequence";

const lineSchema = z.object({ texto: z.string() });

export const beoTemplateDataSchema = z.object({
  numero: z.string(),
  preparadoEl: z.string(),
  evento: z.string(),
  direccion: z.string(),
  telefono: z.string(),
  contacto: z.string(),
  compania: z.string(),
  dia: z.string(),
  fecha: z.string(),
  horario: z.string(),
  eventoTipo: z.string(),
  salon: z.string(),
  garantia: z.string(),
  renta: z.string(),
  cartelera: z.string(),
  tituloDerecha: z.string(),
  alimentos: z.array(lineSchema),
  bebidas: z.array(lineSchema),
  descorche: z.array(lineSchema),
  sistemas: z.array(lineSchema),
  electricidad: z.array(lineSchema),
  accesos: z.array(lineSchema),
  mobiliario: z.array(lineSchema),
  pendiente: z.array(lineSchema),
  personalMontaje: z.array(lineSchema),
  personalEvento: z.array(lineSchema),
  personalDesmontaje: z.array(lineSchema),
  preparacion: z.string(),
  instrucciones: z.string(),
  montaje: z.string(),
  iniciales: z.string(),
});

export type BeoTemplateData = z.infer<typeof beoTemplateDataSchema>;

export type TemplateLine = { texto: string };

/** Marcadores que toda plantilla de B.E.O. debe contener. */
export const REQUIRED_MARKERS = [
  "{numero}",
  "{preparadoEl}",
  "{evento}",
  "{direccion}",
  "{telefono}",
  "{contacto}",
  "{compania}",
  "{dia}",
  "{fecha}",
  "{horario}",
  "{eventoTipo}",
  "{salon}",
  "{garantia}",
  "{renta}",
  "{cartelera}",
  "{tituloDerecha}",
  "{#tieneAlimentos}",
  "{/tieneAlimentos}",
  "{#alimentos}",
  "{/alimentos}",
  "{#bebidas}",
  "{/bebidas}",
  "{#tieneDescorche}",
  "{/tieneDescorche}",
  "{#descorche}",
  "{/descorche}",
  "{#tieneSistemas}",
  "{/tieneSistemas}",
  "{#sistemas}",
  "{/sistemas}",
  "{#tieneElectricidad}",
  "{/tieneElectricidad}",
  "{#electricidad}",
  "{/electricidad}",
  "{#tienePendiente}",
  "{/tienePendiente}",
  "{#pendiente}",
  "{/pendiente}",
  "{#tieneAccesos}",
  "{/tieneAccesos}",
  "{#accesos}",
  "{/accesos}",
  "{#tieneMobiliario}",
  "{/tieneMobiliario}",
  "{#mobiliario}",
  "{/mobiliario}",
  "{#tienePersonal}",
  "{/tienePersonal}",
  "{#tienePersonalMontaje}",
  "{/tienePersonalMontaje}",
  "{#personalMontaje}",
  "{/personalMontaje}",
  "{#tienePersonalEvento}",
  "{/tienePersonalEvento}",
  "{#personalEvento}",
  "{/personalEvento}",
  "{#tienePersonalDesmontaje}",
  "{/tienePersonalDesmontaje}",
  "{#personalDesmontaje}",
  "{/personalDesmontaje}",
  "{preparacion}",
  "{instrucciones}",
  "{#tieneMontaje}",
  "{/tieneMontaje}",
  "{montaje}",
  "{iniciales}",
  "{texto}",
] as const;

export function missingMarkers(documentXml: string): string[] {
  return REQUIRED_MARKERS.filter((marker) => !documentXml.includes(marker));
}

export type PrintLine = {
  section: string;
  groupName: string;
  text: string;
};

export type BeoPrintSource = {
  eventTitle: string;
  company: string;
  contact: string;
  phone: string;
  address: string;
  weekday: string;
  formattedDate: string;
  schedule: string;
  eventType: string;
  salonName: string;
  guarantee: string;
  rent: string;
  billboard: string;
  setup: string;
  specialInstructions: string;
  servicePreparation: string;
  iniciales: string;
  preparedOn: string;
  number: string;
  lines: PrintLine[];
};

/** Fecha de preparación `dd/mm/aaaa` en la hora de Caracas. */
export function formatPreparationDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}/${value("month")}/${value("year")}`;
}

function linesOf(lines: PrintLine[], section: string): TemplateLine[] {
  return lines.filter((line) => line.section === section).map((line) => ({ texto: line.text }));
}

function personnelBucket(groupName: string): "montaje" | "evento" | "desmontaje" {
  const name = groupName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (name.includes("desmont")) {
    return "desmontaje";
  }
  if (name.includes("montaj")) {
    return "montaje";
  }
  return "evento";
}

function personnel(lines: PrintLine[], bucket: "montaje" | "evento" | "desmontaje"): TemplateLine[] {
  return lines
    .filter((line) => line.section === "PERSONAL" && personnelBucket(line.groupName) === bucket)
    .map((line) => ({ texto: line.text }));
}

export function rightColumnTitle(input: { bebidas: TemplateLine[] }): string {
  return input.bebidas.length > 0 ? "BEBIDAS" : "";
}

/** Arma el contrato de la plantilla. Las secciones vacías quedan en arreglos vacíos. */
export function toTemplateData(source: BeoPrintSource): BeoTemplateData {
  const printable = source.lines.filter((line) => line.section !== "EXCLUIR");
  const bebidas = linesOf(printable, "BEBIDAS");
  const sistemas = linesOf(printable, "SISTEMAS");
  return beoTemplateDataSchema.parse({
    numero: source.number,
    preparadoEl: source.preparedOn,
    evento: source.eventTitle,
    direccion: source.address,
    telefono: source.phone,
    contacto: source.contact,
    compania: source.company,
    dia: source.weekday,
    fecha: source.formattedDate,
    horario: source.schedule,
    eventoTipo: source.eventType,
    salon: source.salonName,
    garantia: source.guarantee,
    renta: source.rent,
    cartelera: source.billboard,
    tituloDerecha: rightColumnTitle({ bebidas }),
    alimentos: linesOf(printable, "ALIMENTOS"),
    bebidas,
    descorche: linesOf(printable, "DESCORCHE"),
    sistemas,
    electricidad: linesOf(printable, "ELECTRICIDAD"),
    accesos: linesOf(printable, "ACCESOS"),
    mobiliario: linesOf(printable, "MOBILIARIO"),
    pendiente: linesOf(printable, "PENDIENTE"),
    personalMontaje: personnel(printable, "montaje"),
    personalEvento: personnel(printable, "evento"),
    personalDesmontaje: personnel(printable, "desmontaje"),
    preparacion: source.servicePreparation,
    instrucciones: source.specialInstructions,
    montaje: source.setup,
    iniciales: source.iniciales,
  });
}

export function draftToTemplateData(
  draft: BeoDraft,
  extra: { eventTitle: string; number: string; preparedOn: string; iniciales: string },
): BeoTemplateData {
  const lines: PrintLine[] = [
    ...draft.food.map((line) => ({ section: "ALIMENTOS", groupName: line.group, text: line.text })),
    ...draft.sections
      .filter((section) => section.section !== "ALIMENTOS")
      .flatMap((section) =>
        section.groups.flatMap((group) =>
          group.lines.map((line) => ({ section: section.section, groupName: group.name, text: line.text })),
        ),
      ),
  ];
  return toTemplateData({
    eventTitle: extra.eventTitle,
    company: draft.company.value ?? "",
    contact: draft.contact.value ?? "",
    phone: draft.phone.value ?? "",
    address: draft.address.value ?? "",
    weekday: draft.weekday.value,
    formattedDate: draft.formattedDate.value,
    schedule: draft.schedule.value ?? "",
    eventType: draft.eventType.value,
    salonName: draft.salonName.value,
    guarantee: draft.guarantee.value === null ? "" : String(draft.guarantee.value),
    rent: draft.rentCents.value === null ? "" : formatCents(draft.rentCents.value),
    billboard: draft.billboard.value ?? "",
    setup: draft.setup.value ?? "",
    specialInstructions: draft.specialInstructions.value,
    servicePreparation: draft.servicePreparation.value,
    iniciales: extra.iniciales,
    preparedOn: extra.preparedOn,
    number: extra.number,
    lines,
  });
}

export function templateContext(data: BeoTemplateData): Record<string, unknown> {
  const personalCount = data.personalMontaje.length + data.personalEvento.length + data.personalDesmontaje.length;
  return {
    ...data,
    tieneAlimentos: data.alimentos.length > 0,
    tieneBebidas: data.bebidas.length > 0,
    tieneDescorche: data.descorche.length > 0,
    tieneSistemas: data.sistemas.length > 0 && data.tituloDerecha !== "SISTEMAS",
    tieneElectricidad: data.electricidad.length > 0,
    tienePendiente: data.pendiente.length > 0,
    tieneAccesos: data.accesos.length > 0,
    tieneMobiliario: data.mobiliario.length > 0,
    tienePersonal: personalCount > 0,
    tienePersonalMontaje: data.personalMontaje.length > 0,
    tienePersonalEvento: data.personalEvento.length > 0,
    tienePersonalDesmontaje: data.personalDesmontaje.length > 0,
    tieneMontaje: data.montaje.trim().length > 0,
  };
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function safeFilePart(value: string): string {
  return stripAccents(value)
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** `B.E.O. 0.948 CONGRESO NACIONAL DE REUMATOLOGIA.docx` */
export function beoDownloadName(number: string, eventName: string, extension: "docx" | "pdf"): string {
  const parsed = parseBeoNumber(number);
  const short = parsed ? `0.${String(parsed.lastNumber).padStart(3, "0")}` : safeFilePart(number);
  const title = safeFilePart(eventName).toUpperCase();
  return `B.E.O. ${short} ${title}.${extension}`;
}

export function eventZipName(eventName: string): string {
  const title = safeFilePart(eventName);
  return `${title || "evento"}.zip`;
}

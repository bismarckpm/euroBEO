import { z } from "zod";
import { structureFood, type StructuredFood } from "../beo/food";
import { formatCents, labelAmount } from "../beo/format";
import type { BeoDraft } from "../beo/model";
import { defaultBeoSettings, type BeoSettings } from "../beo/presentation";
import { parseBeoNumber } from "../config/sequence";

const foodItemSchema = z.object({
  title: z.string(),
  lines: z.array(z.string()),
  includes: z.string().optional(),
  note: z.string().optional(),
  paxLabel: z.string().optional(),
  unitPrice: z.string(),
  priceSuffix: z.string(),
});

const rightSectionSchema = z.object({
  title: z.string(),
  lines: z.array(z.string()),
});

const staffSchema = z.object({
  setupLabel: z.string(),
  setup: z.array(z.string()),
  serviceLabel: z.string(),
  service: z.array(z.string()),
  teardownLabel: z.string(),
  teardown: z.array(z.string()),
});

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
  foodItems: z.array(foodItemSchema),
  rightSections: z.array(rightSectionSchema),
  staff: staffSchema,
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
  "{#foodItems}",
  "{/foodItems}",
  "{title}",
  "{#lines}",
  "{/lines}",
  "{.}",
  "{#showIncludes}",
  "{/showIncludes}",
  "{includes}",
  "{#showNote}",
  "{/showNote}",
  "{note}",
  "{#showPax}",
  "{/showPax}",
  "{paxLabel}",
  "{#showPrice}",
  "{/showPrice}",
  "{unitPrice}",
  "{priceSuffix}",
  "{#bebidas}",
  "{/bebidas}",
  "{#tieneSistemas}",
  "{/tieneSistemas}",
  "{#sistemas}",
  "{/sistemas}",
  "{#tieneElectricidad}",
  "{/tieneElectricidad}",
  "{#electricidad}",
  "{/electricidad}",
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
  "{setupLabel}",
  "{#personalMontaje}",
  "{/personalMontaje}",
  "{#tienePersonalEvento}",
  "{/tienePersonalEvento}",
  "{serviceLabel}",
  "{#personalEvento}",
  "{/personalEvento}",
  "{#tienePersonalDesmontaje}",
  "{/tienePersonalDesmontaje}",
  "{teardownLabel}",
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
  description?: string;
  qty?: number;
  unitPriceCents?: number | null;
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
  settings?: BeoSettings;
  /** Pax del bloque, para decidir si el ítem imprime N° pax. */
  blockPax?: number | null;
};

/** Fecha de preparación `dd/mm/aaaa` en la hora de Caracas. */
export function formatPreparationDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("day")}/${value("month")}/${value("year")}`;
}

/** Mantiene el precio y «c/u» en la misma línea dentro de la celda angosta. */
function glueUnit(text: string): string {
  return text.replace(/(\d)\s+(c\/u)\b/gi, "$1\u00A0$2");
}

function personnelBucket(groupName: string): "setup" | "service" | "teardown" {
  const name = groupName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (name.includes("desmont")) {
    return "teardown";
  }
  if (name.includes("montaj")) {
    return "setup";
  }
  return "service";
}

function capitalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function dash(value: string): string {
  return value.trim() ? value : "—";
}

function clock(value: string, uppercase: boolean): string {
  if (!uppercase) {
    return value;
  }
  return value.replace(/a\.?\s*m\.?/gi, "A.M").replace(/p\.?\s*m\.?/gi, "P.M");
}

const RIGHT_TITLES = ["BEBIDAS", "SISTEMAS", "ELECTRICIDAD", "ACCESOS", "MOBILIARIO"] as const;

function printedAmount(text: string): string {
  return glueUnit(labelAmount(text));
}

function sectionTexts(lines: PrintLine[], section: string): string[] {
  return lines.filter((line) => line.section === section).map((line) => printedAmount(line.text));
}

/** Arma el contrato de la plantilla. Las secciones vacías no se imprimen. */
export function toTemplateData(source: BeoPrintSource): BeoTemplateData {
  const settings = source.settings ?? defaultBeoSettings;
  const printable = source.lines.filter((line) => line.section && line.section !== "EXCLUIR");
  const blockPax = source.blockPax ?? (/^\d+$/.test(source.guarantee) ? Number(source.guarantee) : null);
  const foodItems = printable
    .filter((line) => line.section === "ALIMENTOS")
    .map((line) => {
      const food: StructuredFood = structureFood({
        description: line.description?.trim() || line.text,
        qty: line.qty ?? blockPax ?? 0,
        unitPriceCents: line.unitPriceCents === undefined ? null : line.unitPriceCents,
        blockPax,
        setup: source.setup,
        tableCalculation: settings.presentation.tableCalculation,
      });
      return {
        title: food.title,
        lines: food.lines,
        ...(food.includes ? { includes: food.includes } : {}),
        ...(food.note ? { note: food.note } : {}),
        ...(food.paxLabel ? { paxLabel: food.paxLabel } : {}),
        unitPrice: food.unitPrice,
        priceSuffix: food.priceSuffix,
      };
    });
  const drinkLines = [...sectionTexts(printable, "BEBIDAS"), ...sectionTexts(printable, "DESCORCHE")];
  const rightSections = RIGHT_TITLES.flatMap((title) => {
    const lines = title === "BEBIDAS" ? drinkLines : sectionTexts(printable, title);
    return lines.length > 0 ? [{ title, lines }] : [];
  });
  const staffLines = (bucket: "setup" | "service" | "teardown") =>
    printable
      .filter((line) => line.section === "PERSONAL" && personnelBucket(line.groupName) === bucket)
      .map((line) => printedAmount(line.text));
  const uppercase = settings.presentation.uppercaseDayAndContact;
  const evento =
    settings.presentation.eventHeaderSource === "client"
      ? source.company || source.eventTitle
      : source.eventTitle;

  return beoTemplateDataSchema.parse({
    numero: source.number,
    preparadoEl: source.preparedOn,
    evento,
    direccion: dash(source.address),
    telefono: source.phone,
    contacto: uppercase ? source.contact.toUpperCase() : source.contact,
    compania: source.company,
    dia: uppercase ? source.weekday.toUpperCase() : source.weekday,
    fecha: source.formattedDate,
    horario: clock(source.schedule, uppercase),
    eventoTipo: source.eventType,
    salon: source.salonName,
    garantia: source.guarantee,
    renta: labelAmount(dash(source.rent)) || "—",
    cartelera: source.billboard,
    tituloDerecha: drinkLines.length > 0 ? "BEBIDAS" : "",
    foodItems,
    rightSections,
    staff: {
      setupLabel: settings.presentation.setupLabel,
      setup: staffLines("setup"),
      serviceLabel: settings.presentation.serviceLabel,
      service: staffLines("service"),
      teardownLabel: settings.presentation.teardownLabel,
      teardown: staffLines("teardown"),
    },
    preparacion: source.servicePreparation,
    instrucciones: source.specialInstructions,
    montaje: capitalize(source.setup),
    iniciales: source.iniciales,
  });
}

export function draftToTemplateData(
  draft: BeoDraft,
  extra: {
    eventTitle: string;
    number: string;
    preparedOn: string;
    iniciales: string;
    settings?: BeoSettings;
  },
): BeoTemplateData {
  const lines: PrintLine[] = [
    ...draft.food
      .filter((line) => line.section === "ALIMENTOS")
      .map((line) => ({
        section: "ALIMENTOS",
        groupName: line.group,
        text: line.text,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
      })),
    ...draft.sections
      .filter((section) => section.section && section.section !== "ALIMENTOS")
      .flatMap((section) =>
        section.groups.flatMap((group) =>
          group.lines.map((line) => ({
            section: section.section,
            groupName: group.name || line.group,
            text: line.text,
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
          })),
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
    settings: extra.settings,
    blockPax: draft.guarantee.value,
  });
}

function loopLines(lines: string[]): { texto: string }[] {
  return lines.map((texto) => ({ texto }));
}

export function templateContext(data: BeoTemplateData): Record<string, unknown> {
  const bebidas = data.rightSections.find((section) => section.title === "BEBIDAS")?.lines ?? [];
  const sistemas = data.rightSections.find((section) => section.title === "SISTEMAS")?.lines ?? [];
  const electricidad = data.rightSections.find((section) => section.title === "ELECTRICIDAD")?.lines ?? [];
  const accesos = data.rightSections.find((section) => section.title === "ACCESOS")?.lines ?? [];
  const mobiliario = data.rightSections.find((section) => section.title === "MOBILIARIO")?.lines ?? [];
  const personalCount = data.staff.setup.length + data.staff.service.length + data.staff.teardown.length;
  return {
    ...data,
    foodItems: data.foodItems.map((item) => ({
      ...item,
      showIncludes: Boolean(item.includes),
      showNote: Boolean(item.note),
      showPax: Boolean(item.paxLabel),
      showPrice: Boolean(item.unitPrice),
    })),
    tieneAlimentos: data.foodItems.length > 0,
    bebidas: loopLines(bebidas),
    tieneBebidas: bebidas.length > 0,
    tieneDescorche: false,
    descorche: [],
    sistemas: loopLines(sistemas),
    tieneSistemas: sistemas.length > 0 && data.tituloDerecha !== "SISTEMAS",
    electricidad: loopLines(electricidad),
    tieneElectricidad: electricidad.length > 0,
    tienePendiente: false,
    pendiente: [],
    accesos: loopLines(accesos),
    tieneAccesos: accesos.length > 0,
    mobiliario: loopLines(mobiliario),
    tieneMobiliario: mobiliario.length > 0,
    setupLabel: data.staff.setupLabel,
    serviceLabel: data.staff.serviceLabel,
    teardownLabel: data.staff.teardownLabel,
    personalMontaje: loopLines(data.staff.setup),
    personalEvento: loopLines(data.staff.service),
    personalDesmontaje: loopLines(data.staff.teardown),
    tienePersonal: personalCount > 0,
    tienePersonalMontaje: data.staff.setup.length > 0,
    tienePersonalEvento: data.staff.service.length > 0,
    tienePersonalDesmontaje: data.staff.teardown.length > 0,
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
export function beoDownloadName(
  number: string,
  eventName: string,
  extension: "docx" | "pdf",
): string {
  const parsed = parseBeoNumber(number);
  const short = parsed ? `0.${String(parsed.lastNumber).padStart(3, "0")}` : safeFilePart(number);
  const title = safeFilePart(eventName).toUpperCase();
  return `B.E.O. ${short} ${title}.${extension}`;
}

export function eventZipName(eventName: string): string {
  const title = safeFilePart(eventName);
  return `${title || "evento"}.zip`;
}

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

/**
 * Arma `templates/beo.docx` a partir de una B.E.O. Word del hotel.
 * Conserva tablas, estilos y logo; sustituye los datos por marcadores.
 * El archivo de origen vive en fixtures/ y no se versiona.
 */

export const CELL_LINES: Record<number, string[]> = {
  0: ["EVENTO: {evento}", "DIRECCIÓN: {direccion}", "TELÉFONO: {telefono}", "CONTACTO: {contacto}"],
  1: ["COMPAÑÍA:", "{compania}"],
  7: ["{dia}"],
  8: ["{fecha}"],
  9: ["{horario}"],
  10: ["{eventoTipo}"],
  11: ["{salon}"],
  15: ["{garantia}"],
  16: ["{renta}"],
  17: ["{cartelera}"],
  18: ["{#tieneAlimentos}", "ALIMENTOS Y BEBIDAS", "{/tieneAlimentos}"],
  19: ["{tituloDerecha}"],
  20: ["{#alimentos}", "{texto}", "{/alimentos}"],
  23: [
    "{#bebidas}",
    "{texto}",
    "{/bebidas}",
    "{#tieneDescorche}",
    "DESCORCHE",
    "{/tieneDescorche}",
    "{#descorche}",
    "{texto}",
    "{/descorche}",
    "{#tieneSistemas}",
    "SISTEMAS",
    "{/tieneSistemas}",
    "{#sistemas}",
    "{texto}",
    "{/sistemas}",
    "{#tieneElectricidad}",
    "ELECTRICIDAD",
    "{/tieneElectricidad}",
    "{#electricidad}",
    "{texto}",
    "{/electricidad}",
    "{#tienePendiente}",
    "PENDIENTE",
    "{/tienePendiente}",
    "{#pendiente}",
    "{texto}",
    "{/pendiente}",
  ],
  29: ["{#tieneAccesos}", "ACCESOS", "{/tieneAccesos}"],
  31: ["{#accesos}", "{texto}", "{/accesos}"],
  33: ["{#tieneMobiliario}", "MOBILIARIO", "{/tieneMobiliario}"],
  35: ["{#mobiliario}", "{texto}", "{/mobiliario}"],
  37: ["{#tienePersonal}", "PERSONAL", "{/tienePersonal}"],
  39: [
    "{#tienePersonalMontaje}",
    "Montaje",
    "{/tienePersonalMontaje}",
    "{#personalMontaje}",
    "{texto}",
    "{/personalMontaje}",
    "{#tienePersonalEvento}",
    "Evento",
    "{/tienePersonalEvento}",
    "{#personalEvento}",
    "{texto}",
    "{/personalEvento}",
    "{#tienePersonalDesmontaje}",
    "Desmontaje",
    "{/tienePersonalDesmontaje}",
    "{#personalDesmontaje}",
    "{texto}",
    "{/personalDesmontaje}",
  ],
  40: ["{preparacion}"],
  42: ["{#tieneMontaje}", "MONTAJE", "{/tieneMontaje}"],
  43: ["{instrucciones}"],
  44: ["{montaje}"],
  46: ["Aprobado por:", "{iniciales}"],
};

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paragraphWithText(sample: string, text: string): string {
  const open = sample.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>";
  const pPr = sample.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const rPr = sample.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function replaceParagraphs(cell: string, lines: string[]): string {
  const paragraphs = [...cell.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((match) => match[0]);
  const sample = paragraphs[0];
  if (!sample) {
    return cell;
  }
  const rebuilt = lines.map((line) => paragraphWithText(sample, line)).join("");
  const start = cell.indexOf(sample);
  const last = paragraphs[paragraphs.length - 1] ?? sample;
  const end = cell.lastIndexOf(last) + last.length;
  return cell.slice(0, start) + rebuilt + cell.slice(end);
}

export function transformCells(xml: string, only?: Set<number>): string {
  let cursor = 0;
  let index = 0;
  let result = "";
  const cellStart = /<w:tc[\s>]/g;
  while (cursor < xml.length) {
    cellStart.lastIndex = cursor;
    const found = cellStart.exec(xml);
    if (!found) {
      result += xml.slice(cursor);
      break;
    }
    const start = found.index;
    result += xml.slice(cursor, start);
    const end = xml.indexOf("</w:tc>", start);
    if (end < 0) {
      result += xml.slice(start);
      break;
    }
    const cell = xml.slice(start, end + "</w:tc>".length);
    const lines = CELL_LINES[index];
    result += lines && (!only || only.has(index)) ? replaceParagraphs(cell, lines) : cell;
    index += 1;
    cursor = end + "</w:tc>".length;
  }
  return result;
}

export function replaceParagraphContaining(xml: string, needle: string, text: string): string {
  for (const match of xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)) {
    const visible = match[0].replace(/<[^>]+>/g, "");
    if (visible.includes(needle)) {
      return xml.replace(match[0], paragraphWithText(match[0], text));
    }
  }
  throw new Error(`No está el párrafo «${needle}».`);
}

function visibleText(xml: string): string[] {
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1] ?? "");
}

function sourceDocx(): string {
  const dir = path.join(process.cwd(), "fixtures", "beo");
  const files = readdirSync(dir).filter((file) => file.toLowerCase().endsWith(".docx"));
  for (const file of files) {
    const zip = new PizZip(readFileSync(path.join(dir, file)));
    const xml = zip.file("word/document.xml")?.asText() ?? "";
    const cells = xml.split(/<w:tc[\s>]/).length - 1;
    if (cells >= 47 && xml.includes("ALIMENTOS Y BEBIDAS") && xml.includes("RENTA DE SALÓN")) {
      return path.join(dir, file);
    }
  }
  throw new Error("No hay una B.E.O. .docx con la tabla del hotel en fixtures/beo.");
}

const isDirect = process.argv[1]?.replaceAll("\\", "/").includes("build-beo-template");
if (isDirect) {
const source = sourceDocx();
const zip = new PizZip(readFileSync(source));
const documentFile = zip.file("word/document.xml");
if (!documentFile) {
  throw new Error("La B.E.O. no tiene word/document.xml.");
}

let document = documentFile.asText();
document = transformCells(document);
document = replaceParagraphContaining(document, "ORDEN DE SERVICIO", "ORDEN DE SERVICIO # No. {numero}");
document = replaceParagraphContaining(document, "Preparado el día", "Preparado el día: {preparadoEl}");
document = document.replace(/<w:p[\s>][\s\S]*?<\/w:p>/g, (paragraph) => {
  const visible = paragraph.replace(/<[^>]+>/g, "").trim();
  // El párrafo vacío conserva el ancla de la tabla flotante.
  return visible === "JG/AR" ? paragraphWithText(paragraph, " ") : paragraph;
});
zip.file("word/document.xml", document);

const forbidden = ["Leonila", "PETS", "Innovagro", "0424", "6.800", "SUMMIT", "Plaza", "16.10", "0.850", "Coffee", "Cóctel", "tequeño", "Stands", "Viernes", "JG/AR"];
const text = visibleText(document).join("\n");
const leaked = forbidden.filter((token) => text.includes(token));
if (leaked.length > 0) {
  throw new Error(`La plantilla todavía tiene datos del evento: ${leaked.join(", ")}`);
}

const outDir = path.join(process.cwd(), "templates");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "beo.docx");
writeFileSync(out, zip.generate({ type: "nodebuffer" }));
console.log(`Plantilla escrita en ${out}`);
}

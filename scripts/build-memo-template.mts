import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";

/**
 * Arma `templates/memo-estacionamiento.docx` a partir de un memorándum Word del hotel.
 * Conserva el logo y los estilos; sustituye los datos por marcadores.
 * El archivo de origen vive en fixtures/ y no se versiona.
 */

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paragraphWithText(sample: string, text: string): string {
  const open = sample.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>";
  const pPr = sample.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const rPr = sample.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function visibleText(paragraph: string): string {
  return paragraph.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function markMemoDocument(xml: string): string {
  let bodyStarted = false;
  let signatures = 0;
  return xml.replace(/<w:p[\s>][\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = visibleText(paragraph);
    if (text === "MEMORÁNDUM") {
      return paragraphWithText(paragraph, "MEMORÁNDUM {numero}");
    }
    if (text.startsWith("PARA:")) {
      return paragraphWithText(paragraph, "PARA: {para} / {empresa}");
    }
    if (text.startsWith("DE:")) {
      return paragraphWithText(paragraph, "DE: {de} / {cargo}");
    }
    if (text.startsWith("REF:")) {
      return paragraphWithText(paragraph, "REF: {referencia}");
    }
    if (text.startsWith("FECHA:")) {
      return paragraphWithText(paragraph, "FECHA: {fecha}");
    }
    if (text.includes("Por medio de la presente")) {
      bodyStarted = true;
      return paragraphWithText(paragraph, "{cuerpo}");
    }
    if (text.startsWith("Los tickets") || text.includes("De antemano")) {
      return "";
    }
    if (bodyStarted && text && !paragraph.includes("<w:drawing")) {
      signatures += 1;
      if (signatures === 1) return paragraphWithText(paragraph, "{de}");
      if (signatures === 2) return paragraphWithText(paragraph, "{cargo}");
      return "";
    }
    return paragraph;
  });
}

function sourceDocx(): string {
  const dir = path.join(process.cwd(), "fixtures", "memos");
  const file = readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".docx"))
    .sort()
    .find((name) => name.includes("NENA") || name.toLowerCase().includes("nena"));
  if (!file) {
    throw new Error("No hay un memorándum .docx del hotel en fixtures/memos.");
  }
  return path.join(dir, file);
}

const isDirect = process.argv[1]?.replaceAll("\\", "/").includes("build-memo-template");
if (isDirect) {
  const zip = new PizZip(readFileSync(sourceDocx()));
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("El memorándum no tiene word/document.xml.");
  }
  const document = markMemoDocument(documentFile.asText());
  zip.file("word/document.xml", document);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith(".xml")) continue;
    const entry = zip.file(name);
    if (!entry || name === "word/document.xml") continue;
    const xml = entry.asText();
    if (/\b(NENA|Ainhoa|Milbia|Plaza|Cassandra|LETI|Ponce)\b/i.test(xml)) {
      zip.file(name, xml.replace(/<[^>]+>[^<]*(NENA|Ainhoa|Milbia|Plaza|Cassandra|LETI|Ponce)[^<]*<\/[^>]+>/gi, ""));
    }
  }
  const text = [...document.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1] ?? "").join("\n");
  const leaked = ["NENA", "Ainhoa", "Milbia", "Plaza", "Cassandra", "LETI", "Ponce", "2026", "octubre"].filter((token) =>
    text.toLowerCase().includes(token.toLowerCase()),
  );
  if (leaked.length > 0) {
    throw new Error(`La plantilla todavía tiene datos del evento: ${leaked.join(", ")}`);
  }
  const required = ["{numero}", "{fecha}", "{para}", "{empresa}", "{de}", "{cargo}", "{referencia}", "{cuerpo}"];
  const missing = required.filter((marker) => !document.includes(marker));
  if (missing.length > 0) {
    throw new Error(`Faltan marcadores: ${missing.join(", ")}`);
  }
  const outDir = path.join(process.cwd(), "templates");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "memo-estacionamiento.docx");
  writeFileSync(out, zip.generate({ type: "nodebuffer" }));
  console.log(`Plantilla escrita en ${out}`);
}

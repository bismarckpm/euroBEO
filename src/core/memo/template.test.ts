import { readFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { fillDocx } from "../documents/render-docx";
import { memoDownloadName, memoTemplateDataSchema, missingMemoMarkers } from "./template-data";

const templatePath = path.join(process.cwd(), "templates", "memo-estacionamiento.docx");

describe("plantilla del memorándum", () => {
  it("trae los marcadores del hotel y no datos del evento de muestra", () => {
    const xml = new PizZip(readFileSync(templatePath)).file("word/document.xml")?.asText() ?? "";
    expect(missingMemoMarkers(xml)).toEqual([]);
    expect(xml).not.toMatch(/NENA|Ainhoa|Milbia|Plaza|Cassandra/i);
    const zip = new PizZip(readFileSync(templatePath));
    expect(zip.file("word/media/image1.png")).toBeNull();
    expect(zip.file("word/_rels/document.xml.rels")?.asText() ?? "").not.toContain("image1.png");
    expect(zip.file("word/media/image2.png")).toBeTruthy();
    expect(xml).toContain('w:line="3000"');
  });

  it("rechaza una plantilla sin el cuerpo", () => {
    expect(missingMemoMarkers("<w:t>{numero}</w:t>")).toContain("{cuerpo}");
  });

  it("llena el docx y nombra el archivo como el hotel", () => {
    const data = memoTemplateDataSchema.parse({
      numero: "89",
      fecha: "15 de octubre del 2026",
      para: "Sra. Ejemplo",
      empresa: "Servicios Parking 2015 C.A.",
      de: "Ana Pérez",
      cargo: "Asistente de Ventas",
      referencia: "Tarifa de estacionamiento",
      cuerpo: "Evento en Plaza Venezuela.",
    });
    const xml = new PizZip(fillDocx(readFileSync(templatePath), data)).file("word/document.xml")?.asText() ?? "";
    const text = xml.replace(/<[^>]+>/g, " ");
    expect(text).toContain("MEMORÁNDUM 89");
    expect(text).toContain("Plaza Venezuela");
    expect(text).toContain("Ana Pérez");
    expect(text).not.toContain("{cuerpo}");
    expect(memoDownloadName("89", "Gran Encuentro", "docx")).toBe("89 GRAN ENCUENTRO.docx");
  });
});

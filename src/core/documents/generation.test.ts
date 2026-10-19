import { readFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  missingMarkers,
  beoDownloadName,
  toTemplateData,
  type BeoPrintSource,
} from "./beo-template-data";
import { countPages } from "./count-pages";
import { convertToPdf, PdfConversionError } from "./convert-pdf";
import { layoutBeo } from "./layout";
import { consecutiveBeoNumbers, planNumbers, repeatedNumbers } from "./numbers";
import { decidePageFit } from "./page-fit";
import { renderDocx } from "./render-docx";

const template = readFileSync(path.join(process.cwd(), "templates", "beo.docx"));

function source(overrides: Partial<BeoPrintSource> = {}): BeoPrintSource {
  return {
    eventTitle: "Congreso Nacional de Reumatología",
    company: "Sociedad",
    contact: "Ana Pérez",
    phone: "0212-0000000",
    address: "Caracas",
    weekday: "Jueves",
    formattedDate: "22.10.2026",
    schedule: "08:00 am a 05:00 pm",
    eventType: "Congreso",
    salonName: "Topacio",
    guarantee: "200",
    rent: "2.925,00",
    billboard: "REUMATOLOGIA",
    setup: "Auditorio",
    specialInstructions: "Agregar impuestos",
    servicePreparation: "Por Favor estar preparado para el servicio 30 minutos o antes",
    iniciales: "JG/AR",
    preparedOn: "18/10/2026",
    number: "0.948/26",
    lines: [
      { section: "ALIMENTOS", groupName: "Evento", text: "Cena de gala" },
      { section: "BEBIDAS", groupName: "Evento", text: "Agua mineral" },
      { section: "PERSONAL", groupName: "Montaje", text: "02 Montaje USD 25,00 c/u" },
    ],
    ...overrides,
  };
}

async function pdfWithPages(count: number): Promise<Buffer> {
  const document = await PDFDocument.create();
  for (let index = 0; index < count; index += 1) {
    document.addPage();
  }
  return Buffer.from(await document.save());
}

function xmlOf(docx: Buffer): string {
  return new PizZip(docx).file("word/document.xml")?.asText() ?? "";
}

describe("plantilla y nombre de la B.E.O.", () => {
  it("la plantilla del hotel trae todos los marcadores", () => {
    const xml = new PizZip(template).file("word/document.xml")?.asText() ?? "";
    expect(missingMarkers(xml)).toEqual([]);
  });

  it("arma el nombre del hotel sin acentos ni el año", () => {
    expect(beoDownloadName("0.948/26", "Congreso Nacional de Reumatología", "docx")).toBe(
      "B.E.O. 0.948 CONGRESO NACIONAL DE REUMATOLOGIA.docx",
    );
  });

  it("rechaza una plantilla a la que le falta un marcador", () => {
    expect(missingMarkers("<w:t>{numero}</w:t>")).toContain("{preparadoEl}");
  });

  it("pinta los títulos de sección sin viñeta y mantiene c/u junto al precio", () => {
    const xml = xmlOf(
      renderDocx(
        template,
        toTemplateData(
          source({
            lines: [
              { section: "BEBIDAS", groupName: "", text: "100 Refrescos USD 3,00 c/u" },
              { section: "SISTEMAS", groupName: "", text: "01 Internet dedicado USD 300,00 c/u" },
              { section: "MOBILIARIO", groupName: "", text: "05 Mesas USD 60,00 c/u" },
              { section: "PERSONAL", groupName: "Montaje", text: "01 Supervisor USD 40,00 c/u" },
            ],
          }),
        ),
      ),
    );
    const sistemas = xml
      .split(/<w:p[ >]/)
      .find((paragraph) => paragraph.includes("SISTEMAS</w:t>"));
    const group = xml.split(/<w:p[ >]/).find((paragraph) => paragraph.includes("Montaje</w:t>"));
    expect(sistemas).toBeTruthy();
    expect(sistemas).not.toContain("<w:numPr>");
    expect(group).not.toContain("<w:numPr>");
    expect(xml).toContain("300,00\u00A0c/u");
    expect(xml).not.toContain("DESCORCHE");
    expect(xml).not.toContain("ACCESOS");
  });
});

describe("correlativo", () => {
  it("asigna 0.948/26, 0.949/26 y 0.950/26 cuando el último fue 0.947/26", () => {
    const planned = planNumbers({
      last: { lastNumber: 947, year: 26 },
      parts: [
        { id: "a", copies: 1 },
        { id: "b", copies: 1 },
        { id: "c", copies: 1 },
      ],
      overrides: [],
    });
    expect(planned.documents.map((item) => item.number)).toEqual([
      "0.948/26",
      "0.949/26",
      "0.950/26",
    ]);
    expect(consecutiveBeoNumbers({ lastNumber: 947, year: 26 }, 3)).toEqual([
      "0.948/26",
      "0.949/26",
      "0.950/26",
    ]);
  });

  it("advierte un número que ya se usó", () => {
    expect(repeatedNumbers(["0.948/26", "0.949/26"], ["0.948/26"])).toEqual(["0.948/26"]);
  });

  it("respeta el número editado y deja el siguiente para Sistemas", () => {
    const planned = planNumbers({
      last: { lastNumber: 947, year: 26 },
      parts: [{ id: "a", copies: 2 }],
      overrides: ["0.960/26"],
    });
    expect(planned.documents.map((item) => item.number)).toEqual(["0.960/26", "0.961/26"]);
  });
});

describe("una sola página", () => {
  it("separa Sistemas cuando no cabe y marca el exceso si no hay Sistemas", () => {
    expect(decidePageFit(1, true)).toBe("ok");
    expect(decidePageFit(2, true)).toBe("split");
    expect(decidePageFit(2, false)).toBe("exceeds");
  });

  it("cuenta las páginas del PDF", async () => {
    expect(await countPages(await pdfWithPages(2))).toBe(2);
  });

  it("no imprime Descorche vacío y separa Sistemas en otra B.E.O.", async () => {
    const data = toTemplateData(
      source({
        lines: [
          { section: "ALIMENTOS", groupName: "Evento", text: "Cena de gala" },
          { section: "SISTEMAS", groupName: "Evento", text: "Internet 100 Mbps" },
          { section: "PERSONAL", groupName: "Evento", text: "01 Supervisor USD 45,00 c/u" },
        ],
      }),
    );
    const one = await pdfWithPages(1);
    const two = await pdfWithPages(2);
    const laid = await layoutBeo(data, {
      render: (value) => renderDocx(template, value),
      toPdf: async (docx) => {
        const xml = xmlOf(docx);
        return xml.includes("Cena de gala") && xml.includes("Internet 100 Mbps") ? two : one;
      },
      pages: countPages,
    });
    expect(laid).toHaveLength(2);
    expect(laid[0]?.exceedsPage).toBe(false);
    expect(laid[1]?.kind).toBe("systems");
    expect(xmlOf(laid[0]?.docx ?? Buffer.alloc(0))).not.toContain("Internet 100 Mbps");
    expect(xmlOf(laid[0]?.docx ?? Buffer.alloc(0))).not.toContain("DESCORCHE");
    const systems = xmlOf(laid[1]?.docx ?? Buffer.alloc(0));
    expect(systems).toContain("SISTEMAS");
    expect(systems).toContain("Internet 100 Mbps");
    expect(systems).not.toContain("Cena de gala");
  });
});

describe("LibreOffice", () => {
  it("convierte la B.E.O. a PDF", async (context) => {
    const docx = renderDocx(template, toTemplateData(source()));
    try {
      const pdf = await convertToPdf(docx);
      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(await countPages(pdf)).toBeGreaterThan(0);
    } catch (error) {
      if (error instanceof PdfConversionError && error.message.includes("No se encontró")) {
        context.skip();
        return;
      }
      throw error;
    }
  }, 90_000);
});

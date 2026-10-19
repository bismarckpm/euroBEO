import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { templateContext, type BeoTemplateData } from "./beo-template-data";

/** Llena una plantilla .docx. No reconstruye el diseño. */
export function fillDocx(template: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(template);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  document.render(data);
  const generated = document.getZip().generate({ type: "nodebuffer" });
  return Buffer.isBuffer(generated) ? generated : Buffer.from(generated);
}

/** Llena la plantilla original de la B.E.O. */
export function renderDocx(template: Buffer, data: BeoTemplateData): Buffer {
  return fillDocx(template, templateContext(data));
}

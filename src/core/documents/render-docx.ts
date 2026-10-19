import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { templateContext, type BeoTemplateData } from "./beo-template-data";

/** Llena la plantilla .docx original. No reconstruye el diseño. */
export function renderDocx(template: Buffer, data: BeoTemplateData): Buffer {
  const zip = new PizZip(template);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  document.render(templateContext(data));
  const generated = document.getZip().generate({ type: "nodebuffer" });
  return Buffer.isBuffer(generated) ? generated : Buffer.from(generated);
}

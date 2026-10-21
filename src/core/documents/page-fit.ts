import type { BeoTemplateData } from "./beo-template-data";

export type PageFit = "ok" | "split" | "exceeds";

/** Una página entra. Si sobra y hay Sistemas, se separa. Si no hay Sistemas, se marca. */
export function decidePageFit(pageCount: number, hasSystems: boolean): PageFit {
  if (pageCount <= 1) {
    return "ok";
  }
  if (hasSystems) {
    return "split";
  }
  return "exceeds";
}

function systemsOf(data: BeoTemplateData) {
  return data.rightSections.filter((section) => section.title === "SISTEMAS" && section.lines.length > 0);
}

export function withoutSystems(data: BeoTemplateData): BeoTemplateData {
  return {
    ...data,
    rightSections: data.rightSections.filter((section) => section.title !== "SISTEMAS"),
    tituloDerecha: data.tituloDerecha === "SISTEMAS" ? "" : data.tituloDerecha,
  };
}

/** Misma cabecera, día y salón; la columna derecha queda solo con Sistemas. */
export function onlySystems(data: BeoTemplateData): BeoTemplateData {
  return {
    ...data,
    foodItems: [],
    rightSections: systemsOf(data),
    staff: {
      ...data.staff,
      setup: [],
      service: [],
      teardown: [],
    },
    tituloDerecha: "SISTEMAS",
    montaje: "",
  };
}

export function splitForPage(data: BeoTemplateData, pageCount: number): BeoTemplateData[] {
  const decision = decidePageFit(pageCount, systemsOf(data).length > 0);
  if (decision === "split") {
    return [withoutSystems(data), onlySystems(data)];
  }
  return [data];
}

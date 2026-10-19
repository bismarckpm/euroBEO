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

function cleared(): Pick<
  BeoTemplateData,
  | "alimentos"
  | "bebidas"
  | "descorche"
  | "electricidad"
  | "accesos"
  | "mobiliario"
  | "pendiente"
  | "personalMontaje"
  | "personalEvento"
  | "personalDesmontaje"
> {
  return {
    alimentos: [],
    bebidas: [],
    descorche: [],
    electricidad: [],
    accesos: [],
    mobiliario: [],
    pendiente: [],
    personalMontaje: [],
    personalEvento: [],
    personalDesmontaje: [],
  };
}

export function withoutSystems(data: BeoTemplateData): BeoTemplateData {
  return {
    ...data,
    sistemas: [],
    tituloDerecha: data.tituloDerecha === "SISTEMAS" ? "" : data.tituloDerecha,
  };
}

/** Misma cabecera, día y salón; la columna derecha queda solo con Sistemas. */
export function onlySystems(data: BeoTemplateData): BeoTemplateData {
  return {
    ...data,
    ...cleared(),
    sistemas: data.sistemas,
    tituloDerecha: "SISTEMAS",
    montaje: "",
  };
}

export function splitForPage(data: BeoTemplateData, pageCount: number): BeoTemplateData[] {
  const decision = decidePageFit(pageCount, data.sistemas.length > 0);
  if (decision === "split") {
    return [withoutSystems(data), onlySystems(data)];
  }
  return [data];
}

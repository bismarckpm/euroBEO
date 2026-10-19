export type ClientMaskData = {
  company?: string | null;
  contact?: string | null;
  phones?: string | null;
  address?: string | null;
  email?: string | null;
  rif?: string | null;
};

const EUROPEAN_MONEY = /(?:\b(?:usd|us\$|bs\.?)\s*|[$€]\s*)?\d{1,3}(?:\.\d{3})*,\d{2}/gi;
const US_MONEY = /(?:\b(?:usd|us\$|bs\.?)\s*|[$€]\s*)?\d{1,3}(?:,\d{3})*\.\d{2}/gi;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceToken(text: string, token: string | null | undefined, marker: string): string {
  const value = token?.trim();
  if (!value || value.length < 3) {
    return text;
  }
  return text.replace(new RegExp(escapeRegExp(value), "gi"), marker);
}

function replaceList(text: string, raw: string | null | undefined, marker: string): string {
  let next = replaceToken(text, raw, marker);
  for (const part of raw?.split(/[/;,]|\s{2,}/) ?? []) {
    next = replaceToken(next, part, marker);
  }
  return next;
}

/** Quita datos del cliente y montos de un fragmento antes de enviarlo a la IA. */
export function maskFragment(text: string, client: ClientMaskData): string {
  let masked = text;
  masked = replaceToken(masked, client.company, "[CLIENTE]");
  masked = replaceToken(masked, client.contact, "[CONTACTO]");
  masked = replaceToken(masked, client.address, "[DIRECCION]");
  masked = replaceList(masked, client.email, "[CORREO]");
  masked = replaceList(masked, client.rif, "[RIF]");
  masked = replaceList(masked, client.phones, "[TELEFONO]");

  masked = masked.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[CORREO]");
  masked = masked.replace(/\b[VEJGPC]-?\d{5,10}\b/gi, "[RIF]");
  masked = masked.replace(
    /(?:\+58[\s-]?)?(?:\(\s*0?\d{3,4}\s*\)|\b0\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    "[TELEFONO]",
  );
  masked = masked.replace(EUROPEAN_MONEY, " ").replace(US_MONEY, " ");
  masked = masked.replace(/\d{7,}/g, "[NUMERO]");
  return masked
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

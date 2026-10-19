import { formatMemoDate, formatSpanishDayList } from "./days";

export type MemoBeoSource = {
  date: string;
  salon: string;
  kind: string;
  billboard: string;
  billboardConfirmed: boolean;
};

export type MemoTypeSource = {
  recipient: string;
  company: string;
  reference: string;
  body: string;
  excludeSetupDays: boolean;
};

export type MemoSigner = {
  name: string;
  title: string;
};

export type MemoFieldPlan = {
  key: "numero" | "fecha" | "para" | "empresa" | "de" | "cargo" | "referencia" | "cuerpo";
  value: string;
  status: "RULE" | "PENDING" | "REVIEW";
  source: string;
};

function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) {
    return parts[0] ?? "";
  }
  if (parts.length === 2) {
    return `${parts[0]} y ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/** B.E.O. de evento. Si el evento solo tiene montaje o desmontaje, usa esas. */
export function selectMemoBeos(beos: MemoBeoSource[], excludeSetupDays: boolean): MemoBeoSource[] {
  const events = beos.filter((beo) => beo.kind === "EVENTO");
  if (excludeSetupDays && events.length > 0) {
    return events;
  }
  return beos;
}

function uniqueSalons(beos: MemoBeoSource[]): string[] {
  const names: string[] = [];
  const ordered = [...beos].sort((left, right) => left.date.localeCompare(right.date) || left.salon.localeCompare(right.salon, "es"));
  for (const beo of ordered) {
    const salon = beo.salon.trim();
    if (salon && !names.includes(salon)) {
      names.push(salon);
    }
  }
  return names;
}

function eventName(beos: MemoBeoSource[], fallback: string): { value: string; confirmed: boolean } {
  const named = beos.find((beo) => beo.billboard.trim());
  if (!named) {
    return { value: fallback.trim(), confirmed: fallback.trim().length > 0 };
  }
  const value = named.billboard.trim();
  const confirmed = beos.filter((beo) => beo.billboard.trim()).every((beo) => beo.billboardConfirmed);
  return { value, confirmed };
}

function applyBody(body: string, days: string, event: string, salons: string): string {
  return body.replaceAll("{dias}", days).replaceAll("{evento}", event).replaceAll("{salones}", salons);
}

/** Arma los campos del memorándum desde las B.E.O., la configuración y el perfil. */
export function planMemoFields(input: {
  type: MemoTypeSource;
  beos: MemoBeoSource[];
  signer: MemoSigner;
  number: string;
  issuedOn: Date;
  eventTitle: string;
}): MemoFieldPlan[] {
  const selected = selectMemoBeos(input.beos, input.type.excludeSetupDays);
  const days = formatSpanishDayList(selected.map((beo) => beo.date));
  const salons = uniqueSalons(selected);
  const event = eventName(selected, input.eventTitle);
  const salonText = joinSpanish(salons);
  const ready = days.length > 0 && salonText.length > 0 && event.value.length > 0;
  const cuerpoStatus = !ready ? "PENDING" : event.confirmed ? "RULE" : "REVIEW";
  const number = input.number.trim();
  const signerName = input.signer.name.trim();
  const signerTitle = input.signer.title.trim();
  return [
    { key: "numero", value: number, status: number ? "RULE" : "PENDING", source: "memo.number" },
    { key: "fecha", value: formatMemoDate(input.issuedOn), status: "RULE", source: "memo.date" },
    { key: "para", value: input.type.recipient.trim(), status: input.type.recipient.trim() ? "RULE" : "PENDING", source: "memo.config" },
    { key: "empresa", value: input.type.company.trim(), status: input.type.company.trim() ? "RULE" : "PENDING", source: "memo.config" },
    { key: "de", value: signerName, status: signerName ? "RULE" : "PENDING", source: "memo.profile" },
    { key: "cargo", value: signerTitle, status: signerTitle ? "RULE" : "PENDING", source: "memo.profile" },
    { key: "referencia", value: input.type.reference.trim(), status: input.type.reference.trim() ? "RULE" : "PENDING", source: "memo.config" },
    {
      key: "cuerpo",
      value: applyBody(input.type.body, days, event.value, salonText),
      status: cuerpoStatus,
      source: "memo.beo",
    },
  ];
}

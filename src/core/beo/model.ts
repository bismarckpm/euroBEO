import type { FieldStatus } from "../budget/model";

/** Estado de un campo de la propuesta. `REVIEW` marca un dato asignado para que la asistente lo confirme. */
export type BeoFieldStatus = FieldStatus | "REVIEW" | "VALIDATE";

export type BeoKind = "MONTAJE" | "EVENTO" | "DESMONTAJE";

export type BeoField<T> = {
  value: T;
  status: BeoFieldStatus;
  source: string;
};

/** Línea editable de alimentos o de la columna derecha. El texto es la vista; los datos siguen separados. */
export type BeoLine = {
  section: string;
  group: string;
  qty: number;
  description: string;
  unitPriceCents: number | null;
  text: string;
  status: BeoFieldStatus;
  source: string;
};

export type BeoDraft = {
  date: string;
  salon: string;
  kind: BeoKind;
  needsReview: boolean;
  company: BeoField<string | null>;
  contact: BeoField<string | null>;
  phone: BeoField<string | null>;
  address: BeoField<string | null>;
  weekday: BeoField<string>;
  formattedDate: BeoField<string>;
  schedule: BeoField<string | null>;
  eventType: BeoField<string>;
  salonName: BeoField<string>;
  guarantee: BeoField<number | null>;
  /** Céntimos de la renta neta del día. `null` es cortesía: se muestra vacío o con guión. */
  rentCents: BeoField<number | null>;
  billboard: BeoField<string | null>;
  setup: BeoField<string | null>;
  specialInstructions: BeoField<string>;
  servicePreparation: BeoField<string>;
  food: BeoLine[];
  sections: { section: string; groups: { name: string; lines: BeoLine[] }[] }[];
};

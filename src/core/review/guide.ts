export type GuideBeo = {
  id: string;
  salon: string;
  date: string;
  kind: string;
  pendingCount: number;
};

type GuideIssue = { beo: string };

/** Una B.E.O. se marca cuando tiene pendientes o un error de validación, aunque no esté abierta. */
export function beoNeedsReview(beo: Pick<GuideBeo, "salon" | "date" | "pendingCount">, issues: GuideIssue[]): boolean {
  return beo.pendingCount > 0 || issues.some((issue) => issue.beo === `${beo.salon} ${beo.date}`);
}

/** Al abrir el evento, la guía empieza por la primera B.E.O. que todavía hay que revisar. */
export function firstBeoToReview<T extends Pick<GuideBeo, "id" | "salon" | "date" | "pendingCount">>(
  beos: T[],
  issues: GuideIssue[] = [],
): string {
  return beos.find((beo) => beoNeedsReview(beo, issues))?.id ?? beos[0]?.id ?? "";
}

export type GeneratedFileRow = {
  event: string;
  number: string;
  salon: string;
  date: string;
  content: string;
};

/** Una fila de la tabla: el contenido sale del tipo de archivo, no del nombre. */
export function describeGeneratedFile(input: {
  event: string;
  number: string;
  kind: string;
  beo: { salon: string; date: string; kind: string } | null;
}): GeneratedFileRow {
  const content =
    input.kind === "systems"
      ? "sistemas"
      : input.kind === "memo"
        ? "memorándum"
        : input.beo?.kind === "MONTAJE"
          ? "montaje"
          : input.beo?.kind === "DESMONTAJE"
            ? "desmontaje"
            : "evento";
  return {
    event: input.event,
    number: input.number,
    salon: input.beo?.salon ?? "—",
    date: input.beo ? formatGuideDate(input.beo.date) : "—",
    content,
  };
}

function formatGuideDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export type WizardStep =
  | { kind: "datos" }
  | { kind: "beo"; id: string }
  | { kind: "memo"; id: string }
  | { kind: "generar" }
  | { kind: "archivos" };

export type WizardMemo = { id: string; pendingCount: number };

export type WizardInput = {
  beos: Array<GuideBeo & { status?: string }>;
  issues?: GuideIssue[];
  memos?: WizardMemo[];
};

/** Orden del asistente. El memorándum entra solo si todavía hay que revisarlo. */
export function wizardSequence(input: WizardInput): WizardStep[] {
  const steps: WizardStep[] = [{ kind: "datos" }];
  for (const beo of input.beos) {
    steps.push({ kind: "beo", id: beo.id });
  }
  const memo = (input.memos ?? []).find((item) => item.pendingCount > 0);
  if (memo) {
    steps.push({ kind: "memo", id: memo.id });
  }
  steps.push({ kind: "generar" }, { kind: "archivos" });
  return steps;
}

/** El paso donde se abre un evento que ya existe. */
export function entryWizardStep(input: WizardInput): WizardStep {
  const issues = input.issues ?? [];
  const beo = input.beos.find((item) => item.status !== "voided" && beoNeedsReview(item, issues));
  if (beo) {
    return { kind: "beo", id: beo.id };
  }
  const memo = (input.memos ?? []).find((item) => item.pendingCount > 0);
  if (memo) {
    return { kind: "memo", id: memo.id };
  }
  return { kind: "generar" };
}

/** Anterior y Siguiente. Las B.E.O. en cero y las anuladas se saltan. */
export function adjacentWizardStep(input: WizardInput, current: WizardStep, direction: -1 | 1): WizardStep | null {
  const issues = input.issues ?? [];
  const steps = wizardSequence(input);
  const index = steps.findIndex((step) => sameWizardStep(step, current));
  let cursor = index === -1 ? (direction === 1 ? -1 : steps.length) : index;
  while (cursor >= 0 && cursor < steps.length) {
    cursor += direction;
    const candidate = steps[cursor];
    if (!candidate) {
      return null;
    }
    if (candidate.kind === "beo" && !beoStops(input, candidate.id, issues)) {
      continue;
    }
    return candidate;
  }
  return null;
}

export function wizardStepHref(eventId: string, step: WizardStep): string {
  const base = `/eventos/${eventId}/asistente`;
  switch (step.kind) {
    case "datos":
      return `${base}/datos`;
    case "beo":
      return `${base}/beo/${step.id}`;
    case "memo":
      return `${base}/memo/${step.id}`;
    case "generar":
      return `${base}/generar`;
    case "archivos":
      return `${base}/archivos`;
  }
}

function beoStops(input: WizardInput, id: string, issues: GuideIssue[]): boolean {
  const beo = input.beos.find((item) => item.id === id);
  return Boolean(beo && beo.status !== "voided" && beoNeedsReview(beo, issues));
}

function sameWizardStep(left: WizardStep, right: WizardStep): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "beo" && right.kind === "beo") {
    return left.id === right.id;
  }
  if (left.kind === "memo" && right.kind === "memo") {
    return left.id === right.id;
  }
  return true;
}

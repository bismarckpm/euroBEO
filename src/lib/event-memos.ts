import { normalizeLabel } from "../core/config/normalize";
import { planMemoFields, type MemoBeoSource, type MemoFieldPlan } from "../core/memo/content";
import { getPrisma } from "./db";

const OPEN_STATUS = new Set(["PENDING", "AI", "REVIEW"]);

export class MemoFlowError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MemoFlowError";
    this.status = status;
  }
}

export type EventMemoField = {
  id: string;
  key: string;
  value: string | null;
  status: string;
  source: string;
};

export type EventMemo = {
  id: string;
  memoTypeId: string;
  name: string;
  pendingCount: number;
  stale: boolean;
  version: number;
  fields: EventMemoField[];
};

type MemoRecord = {
  id: string;
  memoTypeId: string;
  number: string | null;
  status: string;
  version: number;
  stale: boolean;
  createdAt: Date;
  fields: EventMemoField[];
  memoType: {
    id: string;
    name: string;
    recipient: string;
    company: string;
    reference: string;
    body: string;
    keywords: string[];
    templateFile: string;
    excludeSetupDays: boolean;
  };
  documents: { id: string }[];
};

function pendingOf(fields: { status: string }[]): number {
  return fields.filter((field) => OPEN_STATUS.has(field.status)).length;
}

function triggered(
  keywords: string[],
  benefits: string[],
  triggers: string[],
): boolean {
  const needles = keywords.map((keyword) => normalizeLabel(keyword)).filter(Boolean);
  if (needles.length === 0) {
    return false;
  }
  const benefitHit = benefits.some((benefit) =>
    needles.some((needle) => normalizeLabel(benefit).includes(needle)),
  );
  const triggerHit = triggers.some((trigger) => {
    const text = normalizeLabel(trigger);
    return needles.some((needle) => text === needle || text.includes(needle));
  });
  return benefitHit || triggerHit;
}

function toEventMemo(memo: MemoRecord): EventMemo {
  return {
    id: memo.id,
    memoTypeId: memo.memoTypeId,
    name: memo.memoType.name,
    pendingCount: pendingOf(memo.fields),
    stale: memo.stale,
    version: memo.version,
    fields: memo.fields.map((field) => ({
      id: field.id,
      key: field.key,
      value: field.value,
      status: field.status,
      source: field.source,
    })),
  };
}

async function loadBundle(eventId: string) {
  const prisma = getPrisma();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      budgets: {
        orderBy: { version: "desc" },
        take: 1,
        include: { benefits: { orderBy: { position: "asc" } } },
      },
      beos: { include: { fields: true } },
      memos: { include: { fields: true, memoType: true, documents: { select: { id: true } } } },
    },
  });
  if (!event) {
    throw new MemoFlowError("No se encontró el evento.", 404);
  }
  const signerRow = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { name: true, title: true },
  });
  const beos: MemoBeoSource[] = event.beos.map((beo) => {
    const billboard = beo.fields.find((field) => field.key === "billboard");
    const salonName = beo.fields.find((field) => field.key === "salonName");
    return {
      date: beo.date,
      salon: salonName?.value?.trim() || beo.salon,
      kind: beo.kind,
      billboard: billboard?.value ?? "",
      billboardConfirmed: billboard?.status === "RULE",
    };
  });
  return {
    event,
    beos,
    signer: { name: signerRow?.name ?? "", title: signerRow?.title ?? "" },
    benefits: event.budgets[0]?.benefits.map((benefit) => benefit.text) ?? [],
    triggers: event.budgets[0]?.triggers ?? [],
  };
}

async function applyPlan(memo: MemoRecord, plan: MemoFieldPlan[]): Promise<void> {
  const prisma = getPrisma();
  for (const field of plan) {
    const current = memo.fields.find((item) => item.key === field.key);
    if (current?.source === "memo.edit") {
      continue;
    }
    if (!current) {
      await prisma.memoField.create({
        data: { memoId: memo.id, key: field.key, value: field.value || null, status: field.status, source: field.source },
      });
      continue;
    }
    if (current.value === (field.value || null) && current.status === field.status && current.source === field.source) {
      continue;
    }
    await prisma.memoField.update({
      where: { id: current.id },
      data: { value: field.value || null, status: field.status, source: field.source },
    });
  }
}

function planFor(memo: MemoRecord, bundle: Awaited<ReturnType<typeof loadBundle>>): MemoFieldPlan[] {
  return planMemoFields({
    type: memo.memoType,
    beos: bundle.beos,
    signer: bundle.signer,
    number: memo.number ?? "",
    issuedOn: memo.createdAt,
    eventTitle: bundle.event.title,
  });
}

/** Crea el memorándum que dispara el presupuesto y refresca los campos todavía automáticos. */
export async function syncEventMemos(eventId: string): Promise<EventMemo[]> {
  const prisma = getPrisma();
  const bundle = await loadBundle(eventId);
  const types = await prisma.memoType.findMany({ orderBy: { name: "asc" } });
  const present = new Set(bundle.event.memos.map((memo) => memo.memoTypeId));
  for (const type of types) {
    if (present.has(type.id) || !triggered(type.keywords, bundle.benefits, bundle.triggers)) {
      continue;
    }
    await prisma.memo.create({
      data: {
        eventId,
        memoTypeId: type.id,
        status: "draft",
        manual: false,
        fields: {
          create: planMemoFields({
            type,
            beos: bundle.beos,
            signer: bundle.signer,
            number: "",
            issuedOn: new Date(),
            eventTitle: bundle.event.title,
          }).map((field) => ({
            key: field.key,
            value: field.value || null,
            status: field.status,
            source: field.source,
          })),
        },
      },
    });
    present.add(type.id);
  }

  const fresh = await loadBundle(eventId);
  for (const memo of fresh.event.memos) {
    if (memo.documents.length > 0) {
      continue;
    }
    await applyPlan(memo, planFor(memo, fresh));
  }
  const ready = await loadBundle(eventId);
  return ready.event.memos
    .map(toEventMemo)
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

/** Agrega un memorándum aunque el presupuesto no lo dispare. */
export async function addEventMemo(eventId: string, memoTypeId: string): Promise<void> {
  const prisma = getPrisma();
  const bundle = await loadBundle(eventId);
  const type = await prisma.memoType.findUnique({ where: { id: memoTypeId } });
  if (!type) {
    throw new MemoFlowError("No se encontró el tipo de memorándum.", 404);
  }
  if (bundle.event.memos.some((memo) => memo.memoTypeId === type.id)) {
    throw new MemoFlowError("Ese memorándum ya está en el evento.", 409);
  }
  await prisma.memo.create({
    data: {
      eventId,
      memoTypeId: type.id,
      status: "draft",
      manual: true,
      fields: {
        create: planMemoFields({
          type,
          beos: bundle.beos,
          signer: bundle.signer,
          number: "",
          issuedOn: new Date(),
          eventTitle: bundle.event.title,
        }).map((field) => ({
          key: field.key,
          value: field.value || null,
          status: field.status,
          source: field.source,
        })),
      },
    },
  });
}

export async function updateMemoField(eventId: string, memoId: string, key: string, value: string): Promise<void> {
  const prisma = getPrisma();
  const field = await prisma.memoField.findFirst({
    where: { key, memoId, memo: { eventId } },
  });
  if (!field) {
    throw new MemoFlowError("No se encontró el campo del memorándum.", 404);
  }
  const next = value.trim();
  await prisma.memoField.update({
    where: { id: field.id },
    data: { value: next || null, status: next ? "RULE" : "PENDING", source: "memo.edit" },
  });
  if (key === "numero") {
    await prisma.memo.update({
      where: { id: memoId },
      data: { number: next || null },
    });
  }
}

export async function validateMemoField(eventId: string, memoId: string, key: string): Promise<void> {
  const prisma = getPrisma();
  const field = await prisma.memoField.findFirst({
    where: { key, memoId, memo: { eventId } },
  });
  if (!field) {
    throw new MemoFlowError("No se encontró el campo del memorándum.", 404);
  }
  if (!field.value?.trim()) {
    throw new MemoFlowError("El campo no tiene valor para validar.", 400);
  }
  await prisma.memoField.update({
    where: { id: field.id },
    data: { status: "RULE" },
  });
}

/** Marca los memos ya emitidos cuando las B.E.O. se vuelven a generar. */
export async function markMemosStale(eventId: string): Promise<void> {
  await getPrisma().memo.updateMany({
    where: { eventId, documents: { some: {} } },
    data: { stale: true },
  });
}

/** Vuelve a armar el cuerpo desde las B.E.O. actuales antes de emitir otra versión. */
export async function refreshMemoFromBeos(eventId: string, memoId: string): Promise<MemoRecord> {
  const bundle = await loadBundle(eventId);
  const memo = bundle.event.memos.find((item) => item.id === memoId);
  if (!memo) {
    throw new MemoFlowError("No se encontró el memorándum.", 404);
  }
  const plan = planFor(memo, bundle);
  const prisma = getPrisma();
  for (const field of plan) {
    if (field.key === "numero" || field.key === "fecha") {
      continue;
    }
    const current = memo.fields.find((item) => item.key === field.key);
    if (current?.source === "memo.edit" && field.key !== "cuerpo") {
      continue;
    }
    if (!current) {
      continue;
    }
    await prisma.memoField.update({
      where: { id: current.id },
      data: { value: field.value || null, status: field.status, source: field.source },
    });
  }
  const reloaded = await loadBundle(eventId);
  const ready = reloaded.event.memos.find((item) => item.id === memoId);
  if (!ready) {
    throw new MemoFlowError("No se encontró el memorándum.", 404);
  }
  if (pendingOf(ready.fields) > 0) {
    throw new MemoFlowError("Faltan campos del memorándum.", 409);
  }
  return ready;
}

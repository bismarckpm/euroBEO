import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addBeoLine,
  confirmMemoField,
  deleteBeoLine,
  editMemoField,
  getEventReview,
  mergeBeos,
  regenerateMemo,
  ReviewError,
  splitBeo,
  startGeneration,
  addMemoToEvent,
  retryDriveUpload,
  updateBeoField,
  updateBeoLine,
  updateSharedField,
  validateBeoField,
} from "@/lib/event-review";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-field"),
    beoId: z.string().min(1),
    key: z.string().min(1),
    value: z.string(),
    remember: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("validate-field"),
    beoId: z.string().min(1),
    key: z.string().min(1),
  }),
  z.object({
    action: z.literal("update-shared"),
    key: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    action: z.literal("add-line"),
    beoId: z.string().min(1),
    section: z.string().min(1),
    groupName: z.string(),
    qty: z.number().int(),
    description: z.string(),
    unitPrice: z.string(),
  }),
  z.object({
    action: z.literal("update-line"),
    lineId: z.string().min(1),
    qty: z.number().int(),
    description: z.string(),
    unitPrice: z.string(),
    section: z.string(),
  }),
  z.object({
    action: z.literal("delete-line"),
    lineId: z.string().min(1),
  }),
  z.object({
    action: z.literal("merge"),
    targetId: z.string().min(1),
    sourceId: z.string().min(1),
  }),
  z.object({
    action: z.literal("split"),
    beoId: z.string().min(1),
    salon: z.string(),
    lineIds: z.array(z.string()),
  }),
  z.object({
    action: z.literal("generate"),
    numbers: z.array(z.string()).optional(),
    acknowledge: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("add-memo"),
    memoTypeId: z.string().min(1),
  }),
  z.object({
    action: z.literal("update-memo-field"),
    memoId: z.string().min(1),
    key: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    action: z.literal("validate-memo-field"),
    memoId: z.string().min(1),
    key: z.string().min(1),
  }),
  z.object({
    action: z.literal("regenerate-memo"),
    memoId: z.string().min(1),
  }),
  z.object({
    action: z.literal("retry-drive"),
    documentId: z.string().min(1),
  }),
]);

type RouteContext = { params: Promise<{ id: string }> };

function failure(error: unknown): NextResponse {
  if (error instanceof ReviewError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: "La solicitud no es válida." }, { status: 400 });
  }
  throw error;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    return NextResponse.json(await getEventReview(id));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    const body = bodySchema.parse(await request.json());
    if (body.action === "generate") {
      return NextResponse.json(
        await startGeneration(id, { numbers: body.numbers, acknowledge: body.acknowledge }),
      );
    }
    const review = await applyAction(id, body);
    return NextResponse.json(review);
  } catch (error) {
    return failure(error);
  }
}

async function applyAction(eventId: string, body: z.infer<typeof bodySchema>) {
  switch (body.action) {
    case "update-field":
      return updateBeoField({
        eventId,
        beoId: body.beoId,
        key: body.key,
        value: body.value,
        remember: body.remember ?? false,
      });
    case "validate-field":
      return validateBeoField(eventId, body.beoId, body.key);
    case "update-shared":
      return updateSharedField(eventId, body.key, body.value);
    case "add-line":
      return addBeoLine({ eventId, ...body });
    case "update-line":
      return updateBeoLine({ eventId, ...body });
    case "delete-line":
      return deleteBeoLine(eventId, body.lineId);
    case "merge":
      return mergeBeos(eventId, body.targetId, body.sourceId);
    case "split":
      return splitBeo({ eventId, beoId: body.beoId, salon: body.salon, lineIds: body.lineIds });
    case "generate":
      return startGeneration(eventId, { numbers: body.numbers, acknowledge: body.acknowledge });
    case "add-memo":
      return addMemoToEvent(eventId, body.memoTypeId);
    case "update-memo-field":
      return editMemoField(eventId, body.memoId, body.key, body.value);
    case "validate-memo-field":
      return confirmMemoField(eventId, body.memoId, body.key);
    case "regenerate-memo":
      return regenerateMemo(eventId, body.memoId);
    case "retry-drive":
      return retryDriveUpload(eventId, body.documentId);
  }
}

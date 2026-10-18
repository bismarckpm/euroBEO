import { NextResponse } from "next/server";
import { compareDocumentVersions } from "@/lib/event-history";
import { ReviewError } from "@/lib/event-review";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id, docId } = await context.params;
  try {
    return NextResponse.json(await compareDocumentVersions(id, docId));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}

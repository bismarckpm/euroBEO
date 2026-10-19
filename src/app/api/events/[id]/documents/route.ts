import { NextResponse } from "next/server";
import { listEventDocuments } from "@/lib/beo-documents";
import { ReviewError } from "@/lib/event-review";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    return NextResponse.json(await listEventDocuments(id));
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}

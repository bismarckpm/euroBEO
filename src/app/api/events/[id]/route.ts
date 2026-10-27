import { NextResponse } from "next/server";
import { deleteEvent } from "@/lib/event-history";
import { ReviewError } from "@/lib/event-review";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    await deleteEvent(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ message: "No se pudo eliminar el evento." }, { status: 500 });
  }
}

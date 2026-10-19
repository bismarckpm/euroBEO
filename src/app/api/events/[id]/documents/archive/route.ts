import { NextResponse } from "next/server";
import { eventDocumentZip } from "@/lib/beo-documents";
import { ReviewError } from "@/lib/event-review";

type RouteContext = { params: Promise<{ id: string }> };

function attachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  try {
    const file = await eventDocumentZip(id);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachment(file.fileName),
      },
    });
  } catch (error) {
    if (error instanceof ReviewError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}

import { NextResponse } from "next/server";
import { readGeneratedFile } from "@/lib/beo-documents";
import { ReviewError } from "@/lib/event-review";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

function attachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id, docId } = await context.params;
  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";
  try {
    const file = await readGeneratedFile(id, docId, format);
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
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

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { saveGoldenCandidate } from "@/lib/golden-candidate";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("referencia");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Adjunta la B.E.O. corregida." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".docx") && !name.endsWith(".pdf")) {
    return NextResponse.json({ message: "La referencia debe ser .docx o PDF." }, { status: 400 });
  }
  const event = await getPrisma().event.findUnique({
    where: { id },
    include: { budgets: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!event) {
    return NextResponse.json({ message: "No se encontró el evento." }, { status: 404 });
  }
  const safeName = name.endsWith(".pdf") ? "beo-asistente.pdf" : "beo-asistente.docx";
  await saveGoldenCandidate({
    eventId: id,
    referenceName: safeName,
    reference: Buffer.from(await file.arrayBuffer()),
    budgetPdf: event.budgets[0] ? Buffer.from(event.budgets[0].originalPdf) : null,
  });
  return NextResponse.json({
    message: "El evento quedó marcado como caso dorado candidato.",
  });
}

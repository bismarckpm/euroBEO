import { NextResponse } from "next/server";
import { compareBudgets } from "@/core/budget/compare";
import { toUploadView } from "@/core/budget/view";
import { loadBudgetCatalog } from "@/lib/budget-catalog";
import { readBudgetDocument, readBudgetPdf } from "@/lib/budget-ingest";
import { BudgetReadError } from "@/lib/pdf-text";
import { DuplicateBudgetError, saveBudget } from "@/lib/budget-store";
import { getPrisma } from "@/lib/db";
import { normalizeStoredBudget } from "@/lib/normalization";

function isPdf(file: File, bytes: Uint8Array): boolean {
  const name = file.name.toLowerCase();
  const header =
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  return header && (name.endsWith(".pdf") || file.type === "application/pdf" || file.type === "");
}

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "Selecciona un archivo PDF." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(file, bytes)) {
    return NextResponse.json({ message: "Solo se aceptan archivos PDF." }, { status: 400 });
  }

  try {
    const catalog = await loadBudgetCatalog();
    const document = await readBudgetDocument(bytes, catalog);
    const budget = await normalizeStoredBudget(document.budget);
    const view = toUploadView(budget);
    const fromScan = (budget.origin ?? "digital") === "scan";
    const hasItems = budget.days.some((day) =>
      day.blocks.some((block) => block.sections.some((section) => section.items.length > 0)),
    );
    if (budget.structureErrors.length > 0 && !(fromScan && hasItems)) {
      return NextResponse.json(
        {
          saved: false,
          message: "El PDF no tiene la estructura del presupuesto.",
          ...view,
        },
        { status: 422 },
      );
    }

    const previous = await getPrisma().budget.findFirst({
      where: {
        event: {
          locator: budget.header.locator ?? "",
          company: { equals: budget.client.company ?? "", mode: "insensitive" },
        },
      },
      orderBy: { version: "desc" },
      include: { event: true },
    });
    const differences =
      previous?.event.origin === "scan" && budget.origin !== "scan"
        ? compareBudgets(await readBudgetPdf(Uint8Array.from(previous.originalPdf), catalog), budget)
        : [];

    const saved = await saveBudget({
      budget,
      pdf: bytes,
      fileName: file.name,
      newVersion: form.get("newVersion") === "1",
      justification: null,
      crops: document.crops,
      ocrFields: document.ocrFields,
      handwriting: document.handwriting,
    });
    if (previous?.event.origin === "scan" && budget.origin !== "scan" && differences.length === 0) {
      await getPrisma().event.update({ where: { id: saved.eventId }, data: { origin: "digital" } });
    }

    return NextResponse.json({
      saved: true,
      id: saved.id,
      eventId: saved.eventId,
      version: saved.version,
      origin: fromScan ? "escaneo" : "digital",
      differences,
      arithmetic: budget.arithmetic ?? [],
      message: fromScan
        ? "Presupuesto leído desde un escaneo."
        : differences.length > 0
          ? "El PDF digital tiene diferencias con el escaneo."
          : previous?.event.origin === "scan"
            ? "El PDF digital coincide con el escaneo. Las B.E.O. no cambian."
            : "Presupuesto leído.",
      ...view,
    });
  } catch (error) {
    if (error instanceof BudgetReadError) {
      return NextResponse.json({ saved: false, message: error.message }, { status: 422 });
    }
    if (error instanceof DuplicateBudgetError) {
      return NextResponse.json(
        {
          saved: false,
          duplicate: true,
          eventId: error.eventId,
          message:
            "Ya existe un presupuesto con este localizador y cliente. ¿Es una nueva versión del mismo evento?",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}

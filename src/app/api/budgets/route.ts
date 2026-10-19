import { NextResponse } from "next/server";
import { toUploadView } from "@/core/budget/view";
import { loadBudgetCatalog } from "@/lib/budget-catalog";
import { readBudgetPdf } from "@/lib/budget-ingest";
import { BudgetReadError } from "@/lib/pdf-text";
import { DuplicateBudgetError, saveBudget } from "@/lib/budget-store";

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
    const budget = await readBudgetPdf(bytes, await loadBudgetCatalog());
    const view = toUploadView(budget);
    if (budget.structureErrors.length > 0) {
      return NextResponse.json(
        {
          saved: false,
          message: "El PDF no tiene la estructura del presupuesto.",
          ...view,
        },
        { status: 422 },
      );
    }

    const justification = String(form.get("justification") ?? "").trim();
    if (!budget.reconciliation.ok && !justification) {
      return NextResponse.json(
        {
          saved: false,
          needsJustification: true,
          message:
            "La suma no coincide con el subtotal. Revisa la diferencia o justifícala para continuar.",
          ...view,
        },
        { status: 422 },
      );
    }

    const saved = await saveBudget({
      budget,
      pdf: bytes,
      fileName: file.name,
      newVersion: form.get("newVersion") === "1",
      justification: justification || null,
    });

    return NextResponse.json({
      saved: true,
      id: saved.id,
      version: saved.version,
      message: budget.reconciliation.ok
        ? "Presupuesto leído."
        : "Presupuesto guardado con justificación.",
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

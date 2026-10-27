import { redirect } from "next/navigation";
import { entryWizardStep, wizardStepHref } from "@/core/review/guide";
import { ReviewError, getEventReview } from "@/lib/event-review";

export default async function EventReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await getEventReview(id).then(
    (review) => ({ review, message: null }),
    (error: unknown) => ({
      review: null,
      message: error instanceof ReviewError ? error.message : "No se pudo abrir la revisión.",
    }),
  );
  if (!loaded.review) {
    return (
      <main className="panel">
        <h1>Evento</h1>
        <p className="alert">{loaded.message}</p>
      </main>
    );
  }
  const step = entryWizardStep({
    beos: loaded.review.beos,
    issues: loaded.review.issues,
    memos: loaded.review.memos.map((memo) => ({ id: memo.id, pendingCount: memo.pendingCount })),
  });
  redirect(wizardStepHref(id, step));
}

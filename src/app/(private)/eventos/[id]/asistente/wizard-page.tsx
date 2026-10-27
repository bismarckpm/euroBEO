import { ReviewError, getEventReview } from "@/lib/event-review";
import type { WizardStep } from "@/core/review/guide";
import { ReviewScreen } from "../revision/review-screen";

export async function WizardPage({
  id,
  step,
  announced = false,
}: {
  id: string;
  step: WizardStep;
  announced?: boolean;
}) {
  const loaded = await getEventReview(id).then(
    (review) => ({ review, message: null }),
    (error: unknown) => ({
      review: null,
      message: error instanceof ReviewError ? error.message : "No se pudo abrir el evento.",
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
  return <ReviewScreen initial={loaded.review} step={step} announced={announced} />;
}

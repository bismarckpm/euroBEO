import { ReviewError, getEventReview } from "@/lib/event-review";
import { ReviewScreen } from "./review-screen";

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
        <h1>Revisión</h1>
        <p className="alert">{loaded.message}</p>
      </main>
    );
  }
  return <ReviewScreen initial={loaded.review} />;
}

import type { RowOperationStatus } from "@/lib/admin/row-operations";

// A91: success and failure used to share one `role="status"` span painted in
// the success colour, so a refused delete was announced politely and coloured
// as if it had worked. An error is an alert and is painted in the destructive
// token; a success is a status. Colour is never the only signal — both carry
// their own sentence.
export function RowFeedback({
  feedback,
}: {
  feedback: { status: Exclude<RowOperationStatus, "idle">; message: string } | null;
}) {
  if (!feedback) return null;
  return feedback.status === "error" ? (
    <p role="alert" className="mt-2 w-full text-xs font-semibold text-rust">
      {feedback.message}
    </p>
  ) : (
    <p role="status" className="mt-2 w-full text-xs font-semibold text-leaf">
      {feedback.message}
    </p>
  );
}

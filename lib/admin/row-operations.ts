// A91: the dedicated managers called their Server Actions from bare `onClick`
// handlers — `await setSpaceActive(formData)` with no state around it. Three
// things followed from that, all reachable in the CMS today:
//
//   1. A rejected action (RLS refusal, a row someone else already deleted, a
//      network failure) resolved into nothing. The operator saw the row
//      unchanged and no reason why, so the natural next move was to click
//      again.
//   2. Nothing was pending, so a slow visibility toggle invited a second click
//      against the same row while the first was still in flight.
//   3. Nothing coordinated with the reorder list. A delete that revalidated
//      mid-reorder replaced the list under the operator's unsaved order, and a
//      reorder save that landed after a delete renumbered rows that no longer
//      existed.
//
// This is the pure half of the fix: one operation at a time, whose outcome is
// attributed to the row that asked for it. Keeping it out of the component is
// what lets the stale-completion and duplicate-start rules be tested without a
// browser.

export type RowOperationStatus = "idle" | "success" | "error";

export type RowOperationState = {
  /** The row whose action is in flight, or null when nothing is running. */
  pendingId: string | null;
  /** The row the current message belongs to. */
  feedbackId: string | null;
  status: RowOperationStatus;
  message: string | null;
};

export function initialRowOperations(): RowOperationState {
  return {
    pendingId: null,
    feedbackId: null,
    status: "idle",
    message: null,
  };
}

export type RowOperationEvent =
  | { type: "start"; id: string }
  | { type: "succeed"; id: string; message: string }
  | { type: "fail"; id: string; message: string }
  | { type: "dismiss" };

export function reduceRowOperations(
  state: RowOperationState,
  event: RowOperationEvent,
): RowOperationState {
  switch (event.type) {
    case "start":
      // Single-flight. A second start while one is running would make the next
      // completion ambiguous — it could not be attributed to either row.
      if (state.pendingId !== null) return state;
      return { pendingId: event.id, feedbackId: null, status: "idle", message: null };

    case "succeed":
    case "fail":
      // A completion for a row that is not the pending one is stale: its
      // request was abandoned, or it belongs to an operation this state already
      // moved past. Reporting it would label the wrong row.
      if (state.pendingId !== event.id) return state;
      return {
        pendingId: null,
        feedbackId: event.id,
        status: event.type === "succeed" ? "success" : "error",
        message: event.message,
      };

    case "dismiss":
      // Clears the message without touching a request in flight.
      return { ...state, feedbackId: null, status: "idle", message: null };
  }
}

/** True while this specific row's action is in flight. */
export function isRowPending(state: RowOperationState, id: string): boolean {
  return state.pendingId === id;
}

/**
 * True while *any* row action is in flight. Every row control and the reorder
 * save read this, so the list cannot be renumbered against a row that is
 * being deleted and a second row cannot start while the first is unresolved.
 */
export function isRowBusy(state: RowOperationState): boolean {
  return state.pendingId !== null;
}

/** The message to render beside one row, or null when it has none. */
export function rowFeedback(
  state: RowOperationState,
  id: string,
): { status: Exclude<RowOperationStatus, "idle">; message: string } | null {
  if (state.feedbackId !== id || state.status === "idle" || !state.message) return null;
  return { status: state.status, message: state.message };
}

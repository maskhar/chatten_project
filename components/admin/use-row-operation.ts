"use client";

import { useReducer, useRef } from "react";
import { actionErrorMessage, isRedirectError } from "@/lib/admin/action-feedback";
import {
  initialRowOperations,
  isRowBusy,
  isRowPending,
  reduceRowOperations,
  rowFeedback,
} from "@/lib/admin/row-operations";

/**
 * Client wrapper for one-at-a-time manager row actions.
 *
 * Reducer state makes outcome accessible to the row. `running` is separate on
 * purpose: React schedules `dispatch`, so state alone cannot stop two clicks
 * inside the same event turn from both seeing `pendingId === null`.
 */
export function useRowOperation() {
  const [state, dispatch] = useReducer(reduceRowOperations, undefined, initialRowOperations);
  const running = useRef(false);

  async function run(
    id: string,
    operation: () => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string,
  ) {
    if (running.current) return;
    running.current = true;
    dispatch({ type: "start", id });

    try {
      await operation();
      dispatch({ type: "succeed", id, message: successMessage });
    } catch (error) {
      if (isRedirectError(error)) throw error;
      dispatch({
        type: "fail",
        id,
        message: actionErrorMessage(error, fallbackMessage),
      });
    } finally {
      running.current = false;
    }
  }

  return {
    busy: isRowBusy(state),
    isPending: (id: string) => isRowPending(state, id),
    feedback: (id: string) => rowFeedback(state, id),
    run,
  };
}

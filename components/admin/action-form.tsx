"use client";

import type { ComponentProps, ReactNode } from "react";
import { useActionState } from "react";
import { UnsavedChangesGuard, type SaveStatus } from "@/components/admin/unsaved-changes-guard";
import { actionErrorMessage, isRedirectError } from "@/lib/admin/action-feedback";

// Server Actions were originally bound straight to `<form action={saveThing}>`.
// That is fine for a redirecting success, but a thrown validation/database error
// is consumed by Next's route error boundary, which replaces the whole form.
// The operator cannot correct the value, and no mounted guard remains to warn
// before leaving. Catch ordinary action failures here, where the form can stay
// mounted, surface a usable message, and tell UnsavedChangesGuard not to move
// its server baseline.
//
// This must rethrow redirects. `redirect()` deliberately throws NEXT_REDIRECT
// as control flow; treating it as an error would block every redirecting save.
type ServerAction = (formData: FormData) => Promise<unknown>;
type ActionState = { status: Exclude<SaveStatus, "saving">; message: string | null };
const initialState: ActionState = { status: "idle", message: null };

// A91: the redirect sniff and the redaction-aware message both moved to
// lib/admin/action-feedback.ts. The row actions inside SortableList need the
// same two rules, and a second copy is how one of them drifts.
const SAVE_FAILED = "Penyimpanan gagal. Perubahan Anda masih ada. Periksa formulir lalu coba lagi.";

export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & { action: ServerAction; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionState, formData: FormData): Promise<ActionState> => {
      try {
        await action(formData);
        return { status: "saved", message: null };
      } catch (error) {
        if (isRedirectError(error)) throw error;
        return { status: "error", message: actionErrorMessage(error, SAVE_FAILED) };
      }
    },
    initialState,
  );

  const status: SaveStatus = pending ? "saving" : state.status;

  return (
    <form {...props} action={formAction}>
      <UnsavedChangesGuard status={status} />
      {children}
      {state.status === "error" && !pending ? (
        <p role="alert" className="border-l-4 border-terracotta bg-white px-4 py-3 text-sm text-rust">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

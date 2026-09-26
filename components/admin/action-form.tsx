"use client";

import type { ComponentProps, ReactNode } from "react";
import { useActionState } from "react";
import { UnsavedChangesGuard, type SaveStatus } from "@/components/admin/unsaved-changes-guard";

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

function isRedirectError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === "object"
    && "digest" in error
    && typeof error.digest === "string"
    && error.digest.startsWith("NEXT_REDIRECT"),
  );
}

function feedbackMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  // Production Server Actions intentionally redact error details. Do not echo
  // framework boilerplate, but still tell the operator the form is intact and
  // what they can do next.
  if (!message || /^an error occurred in the server components render/i.test(message)) {
    return "Penyimpanan gagal. Perubahan Anda masih ada. Periksa formulir lalu coba lagi.";
  }
  return message;
}

export function ActionForm({ action, children, ...props }: Omit<ComponentProps<"form">, "action"> & { action: ServerAction; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(
    async (_previous: ActionState, formData: FormData): Promise<ActionState> => {
      try {
        await action(formData);
        return { status: "saved", message: null };
      } catch (error) {
        if (isRedirectError(error)) throw error;
        return { status: "error", message: feedbackMessage(error) };
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

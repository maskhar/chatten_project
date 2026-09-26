"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  UNSAVED_MESSAGE,
  initialGuardState,
  isGuardDirty,
  reduceGuardState,
  serializeFormEntries,
  shouldGuardNavigation,
  type FormSnapshot,
} from "@/lib/admin/unsaved-changes";

// A31: drop this inside any admin <form> to warn before typed-but-unsaved work
// is thrown away. It attaches to its own parent form, so no editor has to
// become a client component or thread a "dirty" flag through its state.
//
// Two exits are covered: leaving the site (beforeunload, the browser's own
// dialog) and following an in-app link (a capture-phase click listener, since
// the App Router's client navigation never fires beforeunload).
//
// A80 fixes what the guard considered "saved". It used to be one line —
//
//     form.addEventListener("submit", markClean);
//
// — which cleared the flag the moment the operator pressed the button, on the
// comment "a successful submit navigates or revalidates". A submit is a
// request, not an outcome. Three consequences, all reachable in the CMS today:
//
//   1. A rejected save (every `save*` action in lib/admin throws on validation
//      failure or a PostgREST error) left the form dirty on screen but the
//      guard clean, so the next sidebar click discarded the work silently —
//      exactly the case the guard exists for, and the only one where the
//      operator has already been told something went wrong.
//   2. Anything typed *while* a slow save was in flight was not in the request,
//      yet was covered by the same clearing.
//   3. A submit blocked before it ever left the browser — native `required`
//      validation on a `<form>` fires no submit event, but a programmatic
//      `requestSubmit()` on an invalid form does not either, while a
//      `preventDefault()` from any other listener does fire one — cleared it.
//
// So the flag is no longer a flag. `lib/admin/unsaved-changes.ts` holds a
// snapshot of the values the server is known to have, and dirtiness is derived
// by comparing it against what is on screen. The baseline moves only on a
// confirmed settle or a reset.
//
// "Confirmed" here means `useFormStatus().pending` observed going true → false
// while this component is still mounted. A server action that throws does not
// reach that state: Next.js routes the error to app/admin/(dashboard)/error.tsx,
// which replaces this whole subtree, so there is no live guard left to mark
// clean. A redirecting action (`?saved=1`) unmounts it too. What remains is the
// revalidate-in-place success, which is the case that needs the baseline moved.
//
// Callers that know better can say so: pass `status` and the heuristic is
// ignored entirely. That is the migration path for A23's `useActionState`
// rewrite, which will have the real outcome in hand.
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function UnsavedChangesGuard({ status }: { status?: SaveStatus } = {}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, dispatch] = useReducer(reduceGuardState, undefined, () => initialGuardState());

  const { pending } = useFormStatus();
  // `status` wins when supplied; otherwise the pending flag stands in for it.
  const saving = status ? status === "saving" : pending;

  const snapshot = useCallback((): FormSnapshot => {
    const form = formRef.current;
    if (!form) return "";
    return serializeFormEntries(new FormData(form).entries());
  }, []);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;
    formRef.current = form;

    // The baseline is whatever the server rendered, captured before the
    // operator can touch anything.
    dispatch({ type: "reset", snapshot: serializeFormEntries(new FormData(form).entries()) });

    const onEdit = () => dispatch({ type: "edit", snapshot: serializeFormEntries(new FormData(form).entries()) });
    const onSubmit = () => dispatch({ type: "submit", snapshot: serializeFormEntries(new FormData(form).entries()) });
    // `reset` fires before the DOM is restored, so read on the next tick.
    const onReset = () => queueMicrotask(() => dispatch({ type: "reset", snapshot: serializeFormEntries(new FormData(form).entries()) }));

    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    form.addEventListener("submit", onSubmit);
    form.addEventListener("reset", onReset);
    return () => {
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("reset", onReset);
      formRef.current = null;
    };
  }, []);

  // Settle. Only a true → false transition counts, so the first render of an
  // already-idle form cannot be mistaken for a save that just finished.
  const wasSaving = useRef(false);
  useEffect(() => {
    const previous = wasSaving.current;
    wasSaving.current = saving;

    if (status === "error") {
      // An explicit failure: the baseline does not move, so the form stays
      // dirty and the warning stays armed.
      dispatch({ type: "settle", outcome: "failure" });
      return;
    }
    if (status === "saved") {
      dispatch({ type: "settle", outcome: "success" });
      return;
    }
    if (previous && !saving) dispatch({ type: "settle", outcome: "success" });
  }, [saving, status]);

  // A save in flight is not a save completed — the request can still be
  // rejected — so the warning stays armed until it settles.
  const armed = isGuardDirty(state) || state.phase === "saving";

  useEffect(() => {
    if (!armed) return;

    const warnOnUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers show their own wording now, but a non-empty returnValue is
      // still what older ones key off.
      event.returnValue = UNSAVED_MESSAGE;
    };

    const warnOnClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const link = (event.target as HTMLElement | null)?.closest?.("a");
      if (!link) return;
      const intent = {
        href: link.getAttribute("href"),
        target: link.getAttribute("target"),
        hasDownload: link.hasAttribute("download"),
        modified: event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0,
      };
      if (!shouldGuardNavigation(intent, window.location.href)) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", warnOnUnload);
    // Capture phase: the router's own handler must not win the click first.
    document.addEventListener("click", warnOnClick, true);
    return () => {
      window.removeEventListener("beforeunload", warnOnUnload);
      document.removeEventListener("click", warnOnClick, true);
    };
  }, [armed]);

  return (
    <span
      ref={anchor}
      hidden
      aria-hidden="true"
      data-unsaved={isGuardDirty(state) ? "true" : "false"}
      data-guard-phase={state.phase}
    />
  );
}

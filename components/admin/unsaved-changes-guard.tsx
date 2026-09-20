"use client";

import { useEffect, useRef, useState } from "react";
import { UNSAVED_MESSAGE, shouldGuardNavigation } from "@/lib/admin/unsaved-changes";

// A31: drop this inside any admin <form> to warn before typed-but-unsaved work
// is thrown away. It attaches to its own parent form, so no editor has to
// become a client component or thread a "dirty" flag through its state.
//
// Two exits are covered: leaving the site (beforeunload, the browser's own
// dialog) and following an in-app link (a capture-phase click listener, since
// the App Router's client navigation never fires beforeunload).
export function UnsavedChangesGuard() {
  const anchor = useRef<HTMLSpanElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const markDirty = () => setDirty(true);
    const markClean = () => setDirty(false);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    // A successful submit navigates or revalidates; either way what is on
    // screen is about to match the server again.
    form.addEventListener("submit", markClean);
    form.addEventListener("reset", markClean);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", markClean);
      form.removeEventListener("reset", markClean);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;

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
  }, [dirty]);

  return <span ref={anchor} hidden aria-hidden="true" data-unsaved={dirty ? "true" : "false"} />;
}

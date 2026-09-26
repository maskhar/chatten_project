"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

// A23: admin forms were plain server-action forms with no pending state, so a
// slow save looked like nothing had happened and invited a second submit
// against the same row. `useFormStatus` reads the status of the nearest parent
// form, which means this stays a small client island inside otherwise
// server-rendered pages — no page has to become a client component for it.
export function SubmitButton({ children, pendingLabel, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={`disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {pending ? (pendingLabel ?? "Menyimpan…") : children}
    </button>
  );
}

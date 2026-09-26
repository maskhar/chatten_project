"use client";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { ROW_ACTION_DANGER } from "@/components/ui/control";
// A23: deletes had no pending state either, and a double-submitted delete is
// worse than a double-submitted save.
//
// A92: this was `text-sm text-red-800 underline` — a raw Tailwind colour outside
// the palette (so outside the contrast gate in tests/palette.test.mjs) on a
// control with no height at all, measuring ~20px. It is the most destructive
// button in the CMS and was the smallest. `ROW_ACTION_DANGER` gives it the 44px
// target, the `terracotta`/`rust` tokens, and the focus-visible ring.
export function DeleteButton({ children = "Hapus dengan aman", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { const { pending } = useFormStatus(); return <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={`${ROW_ACTION_DANGER} disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`} onClick={(event) => { if (!window.confirm("Hapus data ini? Tindakan ini tidak bisa dibatalkan.")) event.preventDefault(); }}>{pending ? "Menghapus…" : children}</button>; }

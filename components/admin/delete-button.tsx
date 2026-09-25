"use client";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
// A23: deletes had no pending state either, and a double-submitted delete is
// worse than a double-submitted save.
export function DeleteButton({ children = "Hapus dengan aman", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { const { pending } = useFormStatus(); return <button {...props} type="submit" disabled={pending || props.disabled} aria-busy={pending} className={`text-sm text-red-800 underline disabled:cursor-not-allowed disabled:opacity-60 ${props.className ?? ""}`} onClick={(event) => { if (!window.confirm("Hapus data ini? Tindakan ini tidak bisa dibatalkan.")) event.preventDefault(); }}>{pending ? "Menghapus…" : children}</button>; }

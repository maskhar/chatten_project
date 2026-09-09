"use client";
import type { ButtonHTMLAttributes } from "react";
export function DeleteButton({ children = "Delete safely", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} type="submit" className={`text-sm text-red-800 underline ${props.className ?? ""}`} onClick={(event) => { if (!window.confirm("Delete this record? This cannot be undone.")) event.preventDefault(); }}>{children}</button>; }

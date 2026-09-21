import type { ButtonHTMLAttributes } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`rounded-sm bg-forest-soft px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-olive disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />; }

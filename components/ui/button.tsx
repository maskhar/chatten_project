import type { ButtonHTMLAttributes } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`rounded-sm bg-[#254632] px-4 py-2 text-sm font-semibold text-[#f8f3e8] transition-colors hover:bg-[#3c4734] disabled:cursor-not-allowed disabled:opacity-60 ${className}`} {...props} />; }

import type { ButtonHTMLAttributes } from "react";
import { FOCUS_RING } from "@/components/ui/control";

// A95: `px-4 py-2 text-sm` measures ~36px and there was no focus ring. Its one
// caller is the Submit on the admin login form — the very first control a
// keyboard user meets in this application, and the one place where a session
// cannot yet exist to make anything else recoverable. `min-h-11` is added via
// inline-flex so the label stays centred in the taller box; the offset colour
// is the login card's own background.
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`inline-flex min-h-11 items-center justify-center rounded-sm bg-forest-soft px-4 text-sm font-semibold text-cream transition-colors hover:bg-olive disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-paper ${className}`} {...props} />; }

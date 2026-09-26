import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { FOCUS_RING } from "@/components/ui/control";

// A49: every public call to action was a hand-copied
// `px-5 py-3 text-sm font-semibold` string — seventeen of them across nine
// files, in four colour treatments, and not one with a visible focus ring.
// components/ui/button.tsx could not absorb them: it is a <button> with the
// admin palette, and most public CTAs are links.
//
// The variants are named for the surface they sit on, not for a hierarchy,
// because that is what actually decides the treatment: `onDark` exists because
// a green band cannot take the `solid` dark fill.
export type CtaVariant = "solid" | "outline" | "onDark" | "accent";

// A95: the focus half of this string was a hand-copy of FOCUS_RING that predated
// it, and it had already drifted — it omitted `focus-visible:outline-none`, so a
// browser drawing both its own outline and the ring drew two. Imported now, so
// there is one definition of what focus looks like in this codebase.
const BASE = `inline-flex min-h-11 items-center justify-center px-5 py-3 text-sm font-semibold transition-colors ${FOCUS_RING}`;

const VARIANTS: Record<CtaVariant, string> = {
  // Cream and sand surfaces.
  solid: "bg-forest text-white hover:bg-forest-soft focus-visible:ring-forest focus-visible:ring-offset-cream",
  outline: "border border-forest text-forest hover:bg-forest hover:text-white focus-visible:ring-forest focus-visible:ring-offset-cream",
  // Green bands and photographs: the offset colour is the band, so the ring
  // reads as a ring rather than as a halo.
  onDark: "border border-white/70 text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-forest",
  // The single peach hero button.
  accent: "bg-peach text-forest hover:bg-peach-deep focus-visible:ring-peach-light focus-visible:ring-offset-forest",
};

export function ctaClassName(variant: CtaVariant = "solid", className = "") {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

export function CtaLink({ href, variant = "solid", className = "", ...props }: { href: string; variant?: CtaVariant } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  // next/link prefetches and client-navigates, which an in-page hash or an
  // off-site URL neither needs nor wants.
  const internal = href.startsWith("/");
  const classes = ctaClassName(variant, className);
  if (!internal) return <a href={href} className={classes} {...props} />;
  return <Link href={href} className={classes} {...props} />;
}

export function CtaButton({ variant = "solid", className = "", ...props }: { variant?: CtaVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={ctaClassName(variant, className)} {...props} />;
}

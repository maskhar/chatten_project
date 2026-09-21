"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/homepage/types";
import { isCurrentPath, navigationLinks } from "@/lib/public-data/navigation";
import { FOCUS_RING, TAP_TARGET } from "@/components/ui/control";

// A75: the header sits on a photograph, so the ring needs an offset colour of
// its own — the transparent header has no background to borrow.
const HEADER_FOCUS = `${FOCUS_RING} focus-visible:ring-peach-light focus-visible:ring-offset-forest`;

export function Header({ navigation }: { navigation: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // A33/A34: the fallback list lives in lib/public-data/navigation.ts so the
  // header, the footer and the server loader cannot drift apart.
  const links = navigationLinks(navigation);
  // A48: aria-current tells a screen reader which entry is the page it is on.
  const current = (href: string) => (isCurrentPath(href, pathname) ? "page" : undefined);

  return (
    <header className="absolute inset-x-0 top-0 z-30 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-12">
        <Link href="/" className={`${TAP_TARGET} ${HEADER_FOCUS} font-serif text-2xl tracking-[0.18em]`} aria-current={current("/")}>CHATTEN</Link>
        {/* A44: min-h/min-w 44px — the previous px-3 py-2 button was well under
            the minimum comfortable touch target on a phone. */}
        <button aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-white/50 px-4 text-sm ${HEADER_FOCUS} md:hidden`}>{open ? "Close" : "Menu"}</button>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm md:flex">
          {links.map((link) => <Link className={`${TAP_TARGET} ${HEADER_FOCUS} transition-opacity hover:opacity-70 aria-[current=page]:underline aria-[current=page]:underline-offset-4`} key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}
          <Link href="/visit" className="border border-white/70 px-4 py-2">Plan Your Visit</Link>
        </nav>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="mx-4 grid gap-1 border border-white/20 bg-forest/95 p-3 text-sm md:hidden">
          {links.map((link) => <Link className="flex min-h-11 items-center px-3 aria-[current=page]:font-semibold" key={link.href} href={link.href} aria-current={current(link.href)} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link className="flex min-h-11 items-center px-3 font-semibold text-peach-light" href="/visit" onClick={() => setOpen(false)}>Plan Your Visit</Link>
        </nav>
      ) : null}
    </header>
  );
}

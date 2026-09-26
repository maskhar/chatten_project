"use client";

import { CtaButton, CtaLink } from "@/components/ui/cta";
import { useEffect } from "react";

// A39: the public tree had no error boundary, so an unhandled throw anywhere
// under it fell through to Next's default screen. This keeps the site's own
// shell and offers a way forward.
//
// It deliberately does not render the error text: a server-side message can
// carry a connection string or a table name, and this page is public.
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Public route error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center text-forest">
      <div>
        <p className="text-xs uppercase tracking-[.22em] text-rust">Something went wrong</p>
        <h1 className="mt-5 font-serif text-4xl sm:text-6xl">This view did not load.</h1>
        <p className="mt-5 text-ink">Try again in a moment, or take another path through Chatten.</p>
        {error.digest ? <p className="mt-2 text-xs text-ink">Reference: {error.digest}</p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaButton type="button" onClick={reset}>Try again</CtaButton>
          <CtaLink href="/" variant="outline">Back Home</CtaLink>
          <CtaLink href="/visit" variant="outline">Plan Your Visit</CtaLink>
        </div>
      </div>
    </main>
  );
}

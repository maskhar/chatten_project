"use client";

import Script from "next/script";
import { checkChatwoot } from "@/lib/env/chatwoot";

declare global {
  interface Window {
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
  }
}

// The Chatwoot live-chat bubble, on every page including /admin.
//
// The vendor's copy-paste snippet is an inline IIFE that builds a <script> tag
// by hand and appends it to the document. That is exactly what next/script
// already does, and doing it by hand in an App Router page costs three things:
// the tag is injected on every client navigation rather than once, it is not
// deduplicated, and the inline block would have to carry the website token as
// interpolated source text. `strategy="afterInteractive"` loads the SDK once,
// after hydration, so it never competes with the page's own content for
// bandwidth — a chat bubble is not worth delaying first paint for.
//
// `onLoad` replaces the snippet's `g.onload`. It is the reason this is a client
// component: a server component cannot pass a function across the boundary.
//
// The env vars are read as whole literals rather than through
// `process.env[NAME]` because Next substitutes `NEXT_PUBLIC_*` into browser
// code only when it can see the full property access at build time; the
// computed form compiles to `undefined` here and the widget silently vanishes.
export function ChatwootWidget() {
  const verdict = checkChatwoot(process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL, process.env.NEXT_PUBLIC_CHATWOOT_TOKEN);

  // Not configured, or configured wrongly: render nothing. A bad value cannot
  // reach here in a deployed build — next.config.ts calls assertChatwoot() and
  // fails the build first — so this is the "live chat is switched off" path,
  // and a missing chat bubble must never take a page down with it.
  if (!verdict.ok || !verdict.config) return null;

  const { baseUrl, websiteToken } = verdict.config;

  return (
    <Script
      id="chatwoot-sdk"
      src={`${baseUrl}/packs/js/sdk.js`}
      strategy="afterInteractive"
      onLoad={() => window.chatwootSDK?.run({ websiteToken, baseUrl })}
    />
  );
}

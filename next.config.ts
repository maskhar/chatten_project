import type { NextConfig } from "next";
import { assertAppUrl } from "./lib/env/app-url";
import { assertChatwoot, chatwootSocketOrigin } from "./lib/env/chatwoot";

const isDev = process.env.NODE_ENV === "development";

// A47: throws on a production build with no (or a localhost) NEXT_PUBLIC_APP_URL,
// warns otherwise. Runs here because next.config.ts is evaluated once, in plain
// Node, before anything is compiled — so a misconfigured deployment fails at
// build time rather than shipping an uncrawlable site.
assertAppUrl();

// Same idea for the Chatwoot widget: half-configured is fatal here rather than
// a chat bubble that never appears. Returns null when live chat is off.
const chatwoot = assertChatwoot();

// The browser Supabase client (lib/supabase/browser.ts) talks to this origin
// directly, so connect-src has to allow it or admin sign-in breaks. Derived
// from the public env var rather than hardcoded so staging and production do
// not need separate configs. Falls back to the self-hosted production origin
// when the var is absent (e.g. `next build` in a bare CI step).
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://supabase.carubra.com";
  }
})();

// app/visit/page.tsx renders a CMS-controlled <iframe> from
// contact_information.map_embed_url. That value is operator-supplied free
// text, so frame-src is pinned to known map embed hosts: a stored bad URL can
// then fail to frame rather than load an arbitrary origin. A13 adds the
// matching scheme/host validation at write time.
const frameSrc = ["'self'", "https://www.google.com", "https://maps.google.com", "https://www.openstreetmap.org"];

// The Chatwoot widget is a third-party origin embedded in our page, so every
// directive it touches has to name it explicitly — the policy is a default-deny
// and would otherwise block the SDK with nothing but a console error to show
// for it. What it needs, and why:
//   script-src  <origin>/packs/js/sdk.js, injected into this page
//   frame-src   the SDK mounts the chat UI as an <iframe src="<origin>/widget">
//   connect-src the widget's API calls, plus the ActionCable websocket at
//               <origin>/cable — ws(s) is a separate origin to a CSP, so the
//               http(s) form alone does not cover it
//   img-src     the launcher bubble icon and avatars the SDK paints in-page
//   style-src   the SDK's own stylesheet
// Empty when live chat is not configured, which leaves the policy exactly as
// it was.
const chatwootSources = chatwoot ? ` ${chatwoot.baseUrl}` : "";
const chatwootConnect = chatwoot ? ` ${chatwoot.baseUrl} ${chatwootSocketOrigin(chatwoot.baseUrl)}` : "";
if (chatwoot) frameSrc.push(chatwoot.baseUrl);

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is still required: Next.js App Router inlines hydration
  // and Flight payload scripts. Replacing it with a per-request nonce means
  // emitting the header from proxy.ts instead of here; until then this is the
  // working baseline.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${chatwootSources}`,
  `style-src 'self' 'unsafe-inline'${chatwootSources}`,
  // A6 moved every media asset onto this origin (/api/media/[id]), so the
  // Supabase origin is no longer an image source and is not listed here.
  `img-src 'self' data: blob:${chatwootSources}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}${chatwootConnect}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${frameSrc.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // No remotePatterns: after A6 every <Image src> is the same-origin
  // /api/media/[id] route, which next/image already allows. Re-adding the
  // Supabase storage origin here would make the bypass reachable again.

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
          // Only meaningful behind HTTPS (the reverse proxy terminates TLS in
          // production); harmless as a no-op header over plain HTTP in dev.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};
export default nextConfig;

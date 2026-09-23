// The Chatwoot live-chat widget is loaded from a self-hosted Chatwoot
// instance, so both its origin and the inbox it points at are deployment
// configuration, not constants: staging and production must be able to talk to
// different inboxes without a code change.
//
// Two variables, and they are only meaningful together:
//   NEXT_PUBLIC_CHATWOOT_BASE_URL   the Chatwoot origin (e.g. https://chatwoot.example)
//   NEXT_PUBLIC_CHATWOOT_TOKEN      the inbox's website token
//
// Both unset is a supported state — the widget is simply off. Exactly one set
// is always a mistake, and a silent one: the widget would never render and
// nothing would say why. `assertChatwoot()` runs from next.config.ts so that
// mistake fails the build instead.
//
// The values are `NEXT_PUBLIC_*`, so they are compiled into the browser bundle
// at build time. That is correct here: a website token is public by design (it
// is visible in the page source of every site running the widget) and only
// identifies which inbox a visitor's message lands in.

export type ChatwootConfig = { baseUrl: string; websiteToken: string };

export type ChatwootVerdict =
  | { ok: true; config: ChatwootConfig | null }
  | { ok: false; message: string };

export const CHATWOOT_BASE_URL = "NEXT_PUBLIC_CHATWOOT_BASE_URL";
export const CHATWOOT_TOKEN = "NEXT_PUBLIC_CHATWOOT_TOKEN";

export function checkChatwoot(rawBaseUrl: string | undefined, rawToken: string | undefined): ChatwootVerdict {
  const baseUrl = rawBaseUrl?.trim();
  const websiteToken = rawToken?.trim();

  // The widget is optional. Neither set means the operator has not wired up
  // live chat, which is a normal state and not worth a warning on every build.
  if (!baseUrl && !websiteToken) return { ok: true, config: null };

  if (!baseUrl || !websiteToken) {
    const missing = baseUrl ? CHATWOOT_TOKEN : CHATWOOT_BASE_URL;
    const present = baseUrl ? CHATWOOT_BASE_URL : CHATWOOT_TOKEN;
    return { ok: false, message: `${present} is set but ${missing} is not. The Chatwoot widget needs both: the origin to load the SDK from and the website token that identifies the inbox. Set both, or neither to disable the widget.` };
  }

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ok: false, message: `${CHATWOOT_BASE_URL} is not a valid absolute URL: ${JSON.stringify(baseUrl)}. Expected the Chatwoot origin, e.g. https://chatwoot.example.` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, message: `${CHATWOOT_BASE_URL} must be http or https, got ${parsed.protocol.replace(":", "")}.` };
  }

  // A path here would be silently swallowed: the SDK appends its own
  // ("/packs/js/sdk.js", "/widget"), so anything but the bare origin produces
  // a 404 that only shows up in the browser console. Normalise rather than
  // reject — `parsed.origin` drops path, query and hash.
  return { ok: true, config: { baseUrl: parsed.origin, websiteToken } };
}

// Called from next.config.ts, which runs in plain Node before the build, and
// from the component that renders the widget. Misconfiguration is fatal at
// build time so it cannot ship; at render time the caller degrades instead —
// see components/chatwoot-widget.tsx.
export function assertChatwoot(env: NodeJS.ProcessEnv = process.env): ChatwootConfig | null {
  const verdict = checkChatwoot(env[CHATWOOT_BASE_URL], env[CHATWOOT_TOKEN]);
  if (verdict.ok) return verdict.config;
  throw new Error(verdict.message);
}

// The CSP in next.config.ts has to name the Chatwoot origin explicitly, and a
// missing/broken value must not take the whole config down — assertChatwoot()
// has already reported it by the time this is called.
export function chatwootOrigin(env: NodeJS.ProcessEnv = process.env): string | null {
  const verdict = checkChatwoot(env[CHATWOOT_BASE_URL], env[CHATWOOT_TOKEN]);
  return verdict.ok && verdict.config ? verdict.config.baseUrl : null;
}

// The widget opens an ActionCable websocket at <origin>/cable from inside its
// iframe, but connect-src is enforced against the embedding page's policy, so
// the ws(s) origin belongs in the parent's CSP too.
export function chatwootSocketOrigin(baseUrl: string): string {
  return baseUrl.replace(/^http/, "ws");
}

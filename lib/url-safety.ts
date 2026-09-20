// A13 audit remediation: CMS-editable URL fields (cta_url, whatsapp_url,
// directions_url, map_embed_url, social links, canonical_url) are free text
// today. An admin/editor account (or a stored-XSS payload riding one) could
// otherwise write `javascript:`, `data:`, or `vbscript:` into a field the app
// renders as an href or iframe src. These helpers give server actions a
// single place to reject dangerous schemes before a write reaches the DB.

const DEFAULT_SCHEMES = ["https:", "http:"];

/** True if `input` parses as an absolute URL using one of `schemes`. */
export function isSafeUrl(input: string, schemes: string[] = DEFAULT_SCHEMES): boolean {
  try {
    const url = new URL(input);
    return schemes.includes(url.protocol);
  } catch {
    return false;
  }
}

/** True if `input` is a safe absolute URL whose host is in `hosts` (exact match). */
export function isSafeUrlWithHost(input: string, hosts: string[], schemes: string[] = DEFAULT_SCHEMES): boolean {
  try {
    const url = new URL(input);
    return schemes.includes(url.protocol) && hosts.includes(url.hostname);
  } catch {
    return false;
  }
}

/** True if `input` is a same-site path: starts with "/", never "//" (protocol-relative). */
export function isSafeInternalPath(input: string): boolean {
  return input.startsWith("/") && !input.startsWith("//");
}

// Mirrors next.config.ts's CSP frame-src allowlist for map_embed_url — keep
// both in sync if the set of supported map providers changes.
export const MAP_EMBED_HOSTS = ["www.google.com", "maps.google.com", "www.openstreetmap.org"];

// Field keys (across lib/admin/resources.ts) that hold an absolute URL and
// must be validated by saveResource before every insert/update.
export const URL_FIELD_KEYS = ["cta_url", "whatsapp_url", "directions_url", "url", "canonical_url"] as const;

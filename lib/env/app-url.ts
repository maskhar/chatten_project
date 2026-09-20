// A47: `NEXT_PUBLIC_APP_URL` is the only source of the site's absolute origin.
// Every consumer treats it as optional and degrades silently:
//   - lib/seo.ts drops `metadataBase`, the canonical link and the OG `url`
//   - app/sitemap.ts returns `[]`, so `sitemap.xml` is empty
//   - app/robots.ts omits the `Sitemap:` line
//   - app/layout.tsx emits JSON-LD with no `url`
// A production deployment that forgot it therefore builds, serves, and is
// simply invisible to crawlers — with nothing in the logs to say why. This
// turns that into a build failure.

export type AppUrlVerdict =
  | { ok: true; url: string }
  | { ok: false; fatal: boolean; message: string };

export const ALLOW_MISSING_APP_URL = "ALLOW_MISSING_APP_URL";

const MISSING = [
  "NEXT_PUBLIC_APP_URL is not set.",
  "Without it this build emits no canonical URLs, no Open Graph URLs, and an empty sitemap.xml —",
  "the site will build and serve, but search engines cannot index it.",
  `Set it to the public origin (e.g. https://chatten.example), or set ${ALLOW_MISSING_APP_URL}=1 to build anyway.`,
].join(" ");

export function checkAppUrl(
  raw: string | undefined,
  { production, allowMissing = false }: { production: boolean; allowMissing?: boolean },
): AppUrlVerdict {
  const value = raw?.trim();

  if (!value) {
    // Outside a production build a missing value is normal: `next dev` on
    // localhost and a bare CI typecheck both run without it.
    return { ok: false, fatal: production && !allowMissing, message: MISSING };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // A malformed value is always fatal, in every environment: it is a typo,
    // not an omission, and `new URL()` throws at request time in lib/seo.ts.
    return { ok: false, fatal: true, message: `NEXT_PUBLIC_APP_URL is not a valid absolute URL: ${JSON.stringify(value)}. Expected something like https://chatten.example.` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, fatal: true, message: `NEXT_PUBLIC_APP_URL must be http or https, got ${parsed.protocol.replace(":", "")}.` };
  }

  // A canonical tag pointing at localhost is worse than none at all — it tells
  // a crawler the real domain's content lives on a host it cannot reach.
  //
  // It warns rather than fails, though, because `npm run build` on a developer
  // machine is also NODE_ENV=production and localhost is the correct value
  // there. Unlike the omission above, this is an explicit choice someone made;
  // what A47 is guarding against is the silent one.
  if (production && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) {
    return { ok: false, fatal: false, message: `NEXT_PUBLIC_APP_URL points at ${parsed.hostname} in a production build. If this is a deployment rather than a local build, canonical URLs and the sitemap will advertise a host no crawler can reach.` };
  }

  return { ok: true, url: parsed.origin };
}

// Called from next.config.ts, which runs in plain Node before the build.
export function assertAppUrl(env: NodeJS.ProcessEnv = process.env) {
  const verdict = checkAppUrl(env.NEXT_PUBLIC_APP_URL, {
    production: env.NODE_ENV === "production",
    allowMissing: env[ALLOW_MISSING_APP_URL] === "1" || env[ALLOW_MISSING_APP_URL] === "true",
  });
  if (verdict.ok) return verdict.url;
  if (verdict.fatal) throw new Error(verdict.message);
  console.warn(`\n[chatten] ${verdict.message}\n`);
  return undefined;
}

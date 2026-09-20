import type { PublicContact, PublicHour, PublicSocial } from "./types";

// A46: the root layout emitted a `WebSite` object with a name, a description
// and a URL — nothing a search engine can turn into a local business result.
// The CMS has held the address, phone, hours and social profiles since the
// initial migration; this is what turns them into a `Restaurant` node.
//
// Pure and free of `server-only` so the shape can be asserted without a
// database: what it emits is the contract search engines read.

export type SiteIdentity = { name: string; description?: string | null };

// schema.org day names, indexed by the `day_of_week` smallint (0 = Sunday,
// matching Postgres's own `extract(dow)` and the days[] array on the homepage).
const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// schema.org wants HH:MM; Postgres `time` serialises as HH:MM:SS.
const clockTime = (value: string) => value.slice(0, 5);

export function openingHoursSpecification(hours: readonly PublicHour[] | null | undefined) {
  return (hours ?? [])
    // A closed day carries no interval, and a row with only one end of the
    // range describes nothing a consumer can act on — both are omitted rather
    // than emitted as a half-open interval.
    .filter((hour) => !hour.is_closed && hour.opens_at && hour.closes_at && SCHEMA_DAYS[hour.day_of_week])
    .map((hour) => ({
      "@type": "OpeningHoursSpecification" as const,
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[hour.day_of_week]}`,
      opens: clockTime(hour.opens_at as string),
      closes: clockTime(hour.closes_at as string),
    }));
}

function absolute(url: string | null | undefined, base: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url, base ?? undefined).toString();
  } catch {
    return undefined;
  }
}

export function restaurantJsonLd({
  identity,
  contact,
  hours,
  socials,
  appUrl,
}: {
  identity: SiteIdentity;
  contact: PublicContact | null | undefined;
  hours: readonly PublicHour[] | null | undefined;
  socials: readonly PublicSocial[] | null | undefined;
  appUrl: string | undefined;
}) {
  const specification = openingHoursSpecification(hours);
  // `sameAs` is for profiles the business controls. A relative or malformed
  // operator-entered URL is dropped rather than emitted for a crawler to
  // resolve against our own origin.
  const sameAs = (socials ?? [])
    .map((social) => absolute(social.url, undefined))
    .filter((url): url is string => Boolean(url));

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: identity.name,
    ...(identity.description ? { description: identity.description } : {}),
    ...(appUrl ? { url: appUrl } : {}),
    // Every field below is omitted when the CMS row is blank: an empty string
    // in structured data is a worse signal than an absent property.
    ...(contact?.address ? { address: { "@type": "PostalAddress", streetAddress: contact.address } } : {}),
    ...(contact?.phone ? { telephone: contact.phone } : {}),
    ...(contact?.email ? { email: contact.email } : {}),
    ...(absolute(contact?.map_url, undefined) ? { hasMap: absolute(contact?.map_url, undefined) } : {}),
    ...(specification.length ? { openingHoursSpecification: specification } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

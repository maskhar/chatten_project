import type { NavItem } from "@/lib/homepage/types";

// A33/A34: the header used to fall back to a hardcoded list that omitted
// /about and /events, so two finished content pages were unreachable from any
// link on the site. This is the single fallback, and it is only reached when
// navigation_items is empty.
export const FALLBACK_NAVIGATION: readonly NavItem[] = [
  { label: "About", href: "/about", sort_order: 1 },
  { label: "Experience", href: "/experience", sort_order: 2 },
  { label: "Menu", href: "/menu", sort_order: 3 },
  { label: "Spaces", href: "/spaces", sort_order: 4 },
  { label: "Events", href: "/events", sort_order: 5 },
  { label: "Gallery", href: "/gallery", sort_order: 6 },
  { label: "Visit", href: "/visit", sort_order: 7 },
] as const;

// `is_active` is filtered here as well as in the query: anonymous visitors are
// already limited by the `public_content` RLS policy, but a signed-in editor
// reading the same rows through `cms_manage` would otherwise see hidden
// entries in the live header.
export function navigationLinks(items: (NavItem & { is_active?: boolean })[] | null | undefined): NavItem[] {
  const rows = (items ?? []).filter((item) => item && item.label && item.href && item.is_active !== false);
  return rows.length ? [...rows].sort((a, b) => a.sort_order - b.sort_order) : [...FALLBACK_NAVIGATION];
}

// A48: marks the nav entry a screen reader should announce as the current
// page. "/" must be an exact match or it would claim every page; deeper
// entries also own their detail routes, so /events is current on
// /events/night-market.
export function isCurrentPath(href: string, pathname: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

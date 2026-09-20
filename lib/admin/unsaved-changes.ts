// A31: the admin editors are long forms — a mis-clicked sidebar link used to
// discard everything typed since the last save with no warning at all.
//
// The decision of *whether* a given click is actually leaving the page lives
// here rather than in the component so it can be tested without a DOM, and so
// the guard never fires on the cases that look like navigation but are not
// (new tabs, downloads, mailto:, same-page anchors).

export const UNSAVED_MESSAGE = "You have unsaved changes. Leave this page and discard them?";

export type NavigationIntent = {
  href: string | null;
  target: string | null;
  hasDownload: boolean;
  /** ctrl/meta/shift/alt or a middle click — the browser opens a new tab and this page survives. */
  modified: boolean;
};

export function shouldGuardNavigation(intent: NavigationIntent, currentHref: string): boolean {
  if (!intent.href) return false;
  if (intent.hasDownload) return false;
  if (intent.modified) return false;
  if (intent.target && intent.target !== "_self") return false;

  let destination: URL;
  let current: URL;
  try {
    current = new URL(currentHref);
    destination = new URL(intent.href, currentHref);
  } catch {
    return false;
  }

  // mailto:, tel:, and friends hand off to another application; this document
  // stays exactly where it is, so there is nothing to warn about.
  if (destination.protocol !== "http:" && destination.protocol !== "https:") return false;

  // A bare "#id" or a link back to the current URL only moves the scroll
  // position. Compare without the hash so "/admin/menu#top" counts as staying.
  if (destination.origin === current.origin && destination.pathname === current.pathname && destination.search === current.search) return false;

  return true;
}

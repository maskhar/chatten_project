// A31: the admin editors are long forms — a mis-clicked sidebar link used to
// discard everything typed since the last save with no warning at all.
//
// The decision of *whether* a given click is actually leaving the page lives
// here rather than in the component so it can be tested without a DOM, and so
// the guard never fires on the cases that look like navigation but are not
// (new tabs, downloads, mailto:, same-page anchors).
//
// A80 adds the second half of the same reasoning: *when* the form stops being
// dirty. That decision used to live in the component as a single line —
// `form.addEventListener("submit", markClean)` — which cleared the flag when
// the submit *started*, long before any server action had confirmed anything.
// It now lives here as a reducer over a snapshot of the form's values, for the
// same two reasons: it is the part that is easy to get wrong, and it is the
// part that can be tested without a browser.

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

// ---------------------------------------------------------------------------
// A80: dirty tracking
// ---------------------------------------------------------------------------

/**
 * A comparable string standing in for "everything this form currently holds".
 *
 * Dirtiness is derived by comparing two of these rather than kept as a sticky
 * boolean, which is what makes "the operator typed a character and then deleted
 * it again" read as clean, and what makes a baseline something the reducer can
 * *move* on a confirmed save instead of a flag it has to remember to reset.
 */
export type FormSnapshot = string;

function describeValue(value: unknown): string {
  // A File cannot be compared by identity across re-renders and must not be
  // read into memory just to diff it; name + size + mtime is enough to notice
  // that a different file was chosen.
  if (value && typeof value === "object" && "name" in value && "size" in value) {
    const file = value as { name?: unknown; size?: unknown; lastModified?: unknown };
    return `file:${String(file.name ?? "")}:${String(file.size ?? "")}:${String(file.lastModified ?? "")}`;
  }
  return `text:${String(value ?? "")}`;
}

/**
 * Serialize form entries (anything `new FormData(form)` yields) into a
 * `FormSnapshot`.
 *
 * Sorted by field name so a re-render that reorders the DOM — a revalidated
 * server render moving a row, a conditionally rendered fieldset — does not read
 * as an edit. `Array.prototype.sort` is stable, so repeated names (checkbox
 * groups, multi-selects) keep their relative order and stay distinguishable.
 */
export function serializeFormEntries(entries: Iterable<readonly [string, unknown]>): FormSnapshot {
  const rows: [string, string][] = [];
  for (const [name, value] of entries) rows.push([name, describeValue(value)]);
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify(rows);
}

export type GuardPhase = "idle" | "saving";

export type GuardState = {
  /** What the server is known to hold. Only ever moved by a confirmed save or a reset. */
  baseline: FormSnapshot;
  /** What is on screen right now. */
  current: FormSnapshot;
  /** Exactly what was handed to the server action, captured at submit time. */
  submitted: FormSnapshot | null;
  phase: GuardPhase;
};

export type GuardEvent =
  | { type: "edit"; snapshot: FormSnapshot }
  | { type: "submit"; snapshot: FormSnapshot }
  | { type: "settle"; outcome: "success" | "failure" }
  | { type: "reset"; snapshot: FormSnapshot };

export function initialGuardState(snapshot: FormSnapshot = ""): GuardState {
  return { baseline: snapshot, current: snapshot, submitted: null, phase: "idle" };
}

export function isGuardDirty(state: GuardState): boolean {
  return state.current !== state.baseline;
}

export function reduceGuardState(state: GuardState, event: GuardEvent): GuardState {
  switch (event.type) {
    case "edit":
      // Edits are accepted while a save is in flight. They are genuinely
      // unsaved — the request already left with the older values.
      return state.current === event.snapshot ? state : { ...state, current: event.snapshot };

    case "submit":
      // Deliberately does NOT move `baseline`. A submit is a request, not an
      // outcome: until the server answers, everything on screen is still only
      // on screen. This is the whole point of A80.
      return { ...state, current: event.snapshot, submitted: event.snapshot, phase: "saving" };

    case "settle":
      // A status update without a preceding submit belongs to another form or
      // to a stale caller. It cannot honestly confirm this form's values.
      if (state.phase !== "saving" || state.submitted === null) return state;

      if (event.outcome === "failure") {
        // Nothing reached the database, so the baseline is still whatever it
        // was. The form stays dirty and the warning stays armed.
        return { ...state, submitted: null, phase: "idle" };
      }
      // The server now holds exactly the values that were submitted — not
      // necessarily what is on screen. Anything typed while the request was in
      // flight was not part of it and must stay dirty.
      return {
        baseline: state.submitted,
        current: state.current,
        submitted: null,
        phase: "idle",
      };

    case "reset":
      // A reset restores the server-rendered defaults, so the two agree again.
      return { baseline: event.snapshot, current: event.snapshot, submitted: null, phase: "idle" };
  }
}

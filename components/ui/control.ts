// A71/A75. Two things were hand-copied across the whole codebase instead of
// being named once:
//
//   1. `px-2 py-1 text-xs` — the house style for every row action in all six
//      admin managers. It measures ~24px tall: 12px text + a 16px line box +
//      8px of padding. The comfortable touch-target minimum is 44px, so every
//      reorder arrow, Edit, Delete and Hide/Show control in the CMS was ~45%
//      under it, on every phone.
//
//   2. `focus:outline-none` with no dependable replacement. `cta.tsx` was the
//      only file in the repo using `focus-visible:ring`; everywhere else the
//      native outline was stripped unconditionally, or replaced by a
//      `focus:ring` with no offset that also fires on mouse clicks.
//
// Naming them here is what makes them fixable: a single edit moves every
// control at once, and `tests/touch-target.test.mjs` can scan for the raw
// strings coming back.
//
// Why `min-h-11` and not a bigger box: 11 = 2.75rem = 44px exactly. The
// padding stays small so a dense list of actions still reads as dense — the
// target grows, the ink does not.

/** Visible keyboard focus that does not fire on mouse clicks. */
export const FOCUS_RING =
  "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * A compact admin row action — Edit, Delete, ↑, ↓, Hide/Show.
 *
 * Replaces `px-2 py-1 text-xs`. Keeps the 12px label and the tight horizontal
 * padding; only the *height* changes, via `min-h-11` plus `inline-flex
 * items-center` so the label stays centred in the taller box.
 */
export const ROW_ACTION =
  `inline-flex min-h-11 items-center justify-center gap-1 rounded px-3 text-xs font-medium transition-colors ${FOCUS_RING} focus-visible:ring-[#1f3426] focus-visible:ring-offset-[#f7f5f0]`;

/** `ROW_ACTION` with the default border, for the neutral actions. */
export const ROW_ACTION_BORDERED = `${ROW_ACTION} border border-[#c9bfa8] bg-white hover:bg-[#f5f7f3] disabled:opacity-40`;

/** `ROW_ACTION` for a destructive action. Colour is not the only signal — the
 *  label always says Delete. */
export const ROW_ACTION_DANGER = `${ROW_ACTION} border border-[#c26a52] text-[#8f3a22] hover:bg-[#fdf4f1] focus-visible:ring-[#8f3a22]`;

/** `ROW_ACTION` for the one primary action in a row. */
export const ROW_ACTION_PRIMARY = `${ROW_ACTION} bg-[#1f3426] text-white hover:bg-[#2a4732]`;

/**
 * A public text link that stands alone as a call to action — the underlined
 * "View Full Menu" / "Explore Gallery" style. These bypassed `CtaLink`, so
 * they never got its `min-h-11` and measured 25px.
 */
export const TEXT_LINK =
  `inline-flex min-h-11 items-center border-b border-[#1e3024] pb-1 text-sm font-semibold ${FOCUS_RING} focus-visible:ring-[#1f3426] focus-visible:ring-offset-[#f4eedf]`;

/** `TEXT_LINK` for dark surfaces, where the cream offset would glow. */
export const TEXT_LINK_ON_DARK =
  `inline-flex min-h-11 items-center border-b border-white/70 pb-1 text-sm font-semibold ${FOCUS_RING} focus-visible:ring-white focus-visible:ring-offset-[#17271d]`;

/**
 * A wordmark or nav link whose own box is shorter than 44px. Adds the height
 * without adding visible padding, so the layout does not shift.
 */
export const TAP_TARGET = "inline-flex min-h-11 items-center";

"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

// A91: the row Edit control is a `<Link>`, and `<Link disabled>` does nothing —
// the prop is not part of the anchor contract, so a "locked" Edit still
// navigated mid-save and mid-delete, losing whatever the operator had arranged.
//
// Three things are needed to actually lock one, and all three matter:
//
//   - `aria-disabled` so a screen reader announces the state (an anchor cannot
//     carry `disabled`, and removing `href` would drop it from the a11y tree
//     entirely rather than reporting it as unavailable),
//   - `tabIndex={-1}` so it leaves the keyboard order,
//   - `preventDefault` so Enter on a still-focused link and a click that beats
//     the pointer-events rule both stop. `pointer-events-none` alone covers
//     only the mouse.
export function RowLink({
  locked = false,
  className = "",
  onClick,
  ...props
}: ComponentProps<typeof Link> & { locked?: boolean }) {
  return (
    <Link
      {...props}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : props.tabIndex}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={`${className}${locked ? " pointer-events-none opacity-40" : ""}`}
    />
  );
}

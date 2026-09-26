import { SKIP_LINK } from "@/components/ui/control";

export const SKIP_TARGET_ID = "main-content";

// A48: keyboard and screen-reader users had to tab through the whole header
// on every page before reaching the content. The link is visually hidden
// until it takes focus, which is the first Tab stop on the page.
//
// A95: A92 named this pattern as SKIP_LINK for the admin shell, and this file
// kept its own hand-rolled copy — which omitted the ring. Two copies of one
// mechanism is how the public one silently fell behind; there is one now.
export function SkipToContent() {
  return (
    <a href={`#${SKIP_TARGET_ID}`} className={SKIP_LINK}>
      Skip to content
    </a>
  );
}

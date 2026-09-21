export const SKIP_TARGET_ID = "main-content";

// A48: keyboard and screen-reader users had to tab through the whole header
// on every page before reaching the content. The link is visually hidden
// until it takes focus, which is the first Tab stop on the page.
export function SkipToContent() {
  return (
    <a
      href={`#${SKIP_TARGET_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-forest focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to content
    </a>
  );
}

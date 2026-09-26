import type { ReactNode } from "react";
import { Header } from "./header";
import { PublicFooter } from "./public-footer";
import { SkipToContent, SKIP_TARGET_ID } from "./skip-to-content";
import type { NavItem } from "@/lib/homepage/types";
import { getShellData } from "@/lib/public-data/shell";
import { restaurantJsonLd } from "@/lib/public-data/structured-data";
import type { PublicSocial } from "@/lib/public-data/types";
import { FOCUS_RING } from "@/components/ui/control";

// A33: the shell now loads its own chrome. Callers that already have the data
// (the homepage, which fetches everything in one pass) may still pass it in to
// avoid a second round trip.
export async function PublicShell({ children, navigation, socials }: { children: ReactNode; navigation?: NavItem[]; socials?: PublicSocial[] }) {
  // A46 needs identity, contact and hours on every page, so the fetch is no
  // longer conditional. Callers may still override the chrome they already
  // have; getShellData swallows its own failures, so this cannot 500 a page.
  const shell = await getShellData();
  const links = navigation ?? shell.navigation;
  const socialLinks = socials ?? shell.socials;
  // Emitted here rather than in app/layout.tsx because the layout is not
  // async and covers /admin too, where a business card is meaningless.
  const jsonLd = restaurantJsonLd({ identity: shell.identity, contact: shell.contact, hours: shell.hours, socials: socialLinks, appUrl: process.env.NEXT_PUBLIC_APP_URL });
  return (
    <div className="min-h-screen bg-cream text-forest">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SkipToContent />
      <Header navigation={links} />
      {/* A48: the skip link's destination. tabIndex -1 makes it focusable by
          the jump without putting it in the tab order.
          A75: it had `focus:outline-none` and nothing in its place, so the jump
          landed with no visible confirmation of where focus went. The ring is
          drawn `ring-inset` because the container is the full page width and an
          outset ring would sit off-screen on the left and right edges; the
          offset colour is the shell background it is painted over.
          A95: this was a plain <div>, and every page below the homepage rendered
          its own <main> *after* PageHero — so the hero section and the page's
          only <h1> sat outside the main landmark on ten of eleven pages, and the
          skip link jumped to a container that was not a landmark at all. The
          shell owns <main> now; pages render a <div> and keep their own
          spacing. */}
      <main id={SKIP_TARGET_ID} tabIndex={-1} className={`pt-0 ${FOCUS_RING} focus-visible:ring-inset focus-visible:ring-forest focus-visible:ring-offset-cream`}>{children}</main>
      <PublicFooter navigation={links} socials={socialLinks} />
    </div>
  );
}

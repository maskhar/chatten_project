import type { ReactNode } from "react";
import { Header } from "./header";
import { PublicFooter } from "./public-footer";
import { SkipToContent, SKIP_TARGET_ID } from "./skip-to-content";
import type { NavItem } from "@/lib/homepage/types";
import { getShellData } from "@/lib/public-data/shell";
import { restaurantJsonLd } from "@/lib/public-data/structured-data";
import type { PublicSocial } from "@/lib/public-data/types";

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
    <div className="min-h-screen bg-[#f4eedf] text-[#1e3024]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SkipToContent />
      <Header navigation={links} />
      {/* A48: the skip link's destination. tabIndex -1 makes it focusable by
          the jump without putting it in the tab order. */}
      <div id={SKIP_TARGET_ID} tabIndex={-1} className="pt-0 focus:outline-none">{children}</div>
      <PublicFooter navigation={links} socials={socialLinks} />
    </div>
  );
}

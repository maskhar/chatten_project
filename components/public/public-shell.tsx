import type { ReactNode } from "react";
import { Header } from "./header";
import { PublicFooter } from "./public-footer";
import { SkipToContent, SKIP_TARGET_ID } from "./skip-to-content";
import type { NavItem } from "@/lib/homepage/types";
import { getShellData } from "@/lib/public-data/shell";
import type { PublicSocial } from "@/lib/public-data/types";

// A33: the shell now loads its own chrome. Callers that already have the data
// (the homepage, which fetches everything in one pass) may still pass it in to
// avoid a second round trip.
export async function PublicShell({ children, navigation, socials }: { children: ReactNode; navigation?: NavItem[]; socials?: PublicSocial[] }) {
  const shell = navigation === undefined || socials === undefined ? await getShellData() : null;
  const links = navigation ?? shell?.navigation ?? [];
  const socialLinks = socials ?? shell?.socials ?? [];
  return (
    <div className="min-h-screen bg-[#f4eedf] text-[#1e3024]">
      <SkipToContent />
      <Header navigation={links} />
      {/* A48: the skip link's destination. tabIndex -1 makes it focusable by
          the jump without putting it in the tab order. */}
      <div id={SKIP_TARGET_ID} tabIndex={-1} className="pt-0 focus:outline-none">{children}</div>
      <PublicFooter navigation={links} socials={socialLinks} />
    </div>
  );
}

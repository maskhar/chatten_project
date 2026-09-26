import Link from "next/link";
import type { NavItem } from "@/lib/homepage/types";
import { navigationLinks } from "@/lib/public-data/navigation";
import type { PublicSocial } from "@/lib/public-data/types";
import { FOCUS_RING, TAP_TARGET } from "@/components/ui/control";

// A71: the footer links were 20px tall and 12px apart — the densest cluster of
// under-sized targets on the site, and it ships on every page. TAP_TARGET adds
// the height without visible padding; gap-y-1 replaces gap-y-3 because the
// 44px boxes now supply the separation themselves.
//
// A95: A71 fixed the height and left the focus ring out. The footer is the
// last tab stop on every page and holds the outbound social links, so it was
// the densest cluster of *invisible* focus on the site for the same reason it
// was the densest cluster of small targets. The offset colour is the deep
// green the footer is painted in; white ring, because nothing else reads on it.
const FOOTER_FOCUS = `${FOCUS_RING} focus-visible:ring-white focus-visible:ring-offset-forest-deep`;
const FOOTER_LINK = `${TAP_TARGET} ${FOOTER_FOCUS} text-white/75 hover:text-white`;

// A34/A35: the footer link list was hardcoded and omitted /about and /events.
// It now renders the same CMS-resolved navigation as the header, so adding a
// page in the CMS surfaces it in both places at once.
export function PublicFooter({ navigation = [], socials = [] }: { navigation?: NavItem[]; socials?: PublicSocial[] }) {
  const links = navigationLinks(navigation);
  return (
    <footer className="bg-forest-deep py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 md:flex-row lg:px-12">
        <div>
          <Link href="/" className={`${TAP_TARGET} ${FOOTER_FOCUS} font-serif text-3xl tracking-[.14em]`}>CHATTEN</Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">A place to eat, talk, and experience Batu.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {links.map((link) => <Link href={link.href} className={FOOTER_LINK} key={link.href}>{link.label}</Link>)}
          {socials.map((social) => <a className={FOOTER_LINK} href={social.url} key={social.platform} target="_blank" rel="noreferrer">{social.label ?? social.platform}</a>)}
        </nav>
      </div>
    </footer>
  );
}

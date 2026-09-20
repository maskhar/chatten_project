import Link from "next/link";
import type { NavItem } from "@/lib/homepage/types";
import { navigationLinks } from "@/lib/public-data/navigation";
import type { PublicSocial } from "@/lib/public-data/types";

// A34/A35: the footer link list was hardcoded and omitted /about and /events.
// It now renders the same CMS-resolved navigation as the header, so adding a
// page in the CMS surfaces it in both places at once.
export function PublicFooter({ navigation = [], socials = [] }: { navigation?: NavItem[]; socials?: PublicSocial[] }) {
  const links = navigationLinks(navigation);
  return (
    <footer className="bg-[#17271d] py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 md:flex-row lg:px-12">
        <div>
          <Link href="/" className="font-serif text-3xl tracking-[.14em]">CHATTEN</Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">A place to eat, talk, and experience Batu.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {links.map((link) => <Link href={link.href} className="text-white/75 hover:text-white" key={link.href}>{link.label}</Link>)}
          {socials.map((social) => <a className="text-white/75 hover:text-white" href={social.url} key={social.platform} target="_blank" rel="noreferrer">{social.label ?? social.platform}</a>)}
        </nav>
      </div>
    </footer>
  );
}

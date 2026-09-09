import type { ReactNode } from "react";
import { Header } from "./header";
import { PublicFooter } from "./public-footer";
import type { NavItem } from "@/lib/homepage/types";
import type { PublicSocial } from "@/lib/public-data/types";
export function PublicShell({ children, navigation = [], socials = [] }: { children: ReactNode; navigation?: NavItem[]; socials?: PublicSocial[] }) { return <div className="min-h-screen bg-[#f4eedf] text-[#1e3024]"><Header navigation={navigation} /><div className="pt-0">{children}</div><PublicFooter socials={socials} /></div>; }

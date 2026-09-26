import type { Metadata } from "next";
import { MediaImage } from "@/components/public/media-image";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicCards, publicMedia } from "@/lib/public-data/queries";
import { seoMetadata } from "@/lib/public-data/seo";
import { CARD_FOCUS } from "@/components/ui/control";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return seoMetadata("spaces", "Spaces", "Find your place at Chatten Cafe.", "/spaces"); }
export default async function SpacesPage() { const [items, media] = await Promise.all([publicCards("spaces"), publicMedia()]); return <PublicShell><PageHero eyebrow="Where it happens" title="Find your place at Chatten." description="Choose the atmosphere that fits your people, your pace, and the moment." /><div className="py-20"><div className="mx-auto max-w-7xl px-6 lg:px-12"><div className="grid gap-6 md:grid-cols-2">{items.map((item) => <a href={`/spaces/${item.slug}`} className={`group overflow-hidden bg-sand ${CARD_FOCUS}`} key={item.id}><div className="h-72 overflow-hidden"><MediaImage media={media[item.image_media_id ?? ""]} alt="" sizes="(min-width: 768px) 50vw, 100vw" className="h-full transition-transform duration-500 group-hover:scale-[1.02]" /></div><div className="p-7"><h2 className="font-serif text-4xl">{item.name}</h2>{item.description ? <p className="mt-3 leading-7 text-ink">{item.description}</p> : null}</div></a>)}</div>{!items.length ? <p className="text-ink">Spaces will be curated soon.</p> : null}</div></div></PublicShell>; }

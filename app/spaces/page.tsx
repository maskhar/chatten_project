import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { mediaUrl } from "@/lib/public-data/media";
import { publicCards, publicMedia } from "@/lib/public-data/queries";
import { seoMetadata } from "@/lib/public-data/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return seoMetadata("spaces", "Spaces", "Find your place at Chatten Cafe.", "/spaces"); }
export default async function SpacesPage() { const [items, media] = await Promise.all([publicCards("spaces"), publicMedia()]); return <PublicShell><PageHero eyebrow="Where it happens" title="Find your place at Chatten." description="Choose the atmosphere that fits your people, your pace, and the moment." /><main className="py-20"><div className="mx-auto max-w-7xl px-6 lg:px-12"><div className="grid gap-6 md:grid-cols-2">{items.map((item) => <a href={`/spaces/${item.slug}`} className="group overflow-hidden bg-[#e8dfca]" key={item.id}><div className="h-72 bg-[#405542] transition-transform duration-500 group-hover:scale-[1.02]" style={mediaUrl(media[item.image_media_id ?? ""]) ? { backgroundImage: `url(${mediaUrl(media[item.image_media_id ?? ""])})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} /><div className="p-7"><h2 className="font-serif text-4xl">{item.name}</h2>{item.description ? <p className="mt-3 leading-7 text-[#596052]">{item.description}</p> : null}</div></a>)}</div>{!items.length ? <p className="text-[#596052]">Spaces will be curated soon.</p> : null}</div></main></PublicShell>; }

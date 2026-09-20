import type { Metadata } from "next";
import { MediaImage } from "@/components/public/media-image";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicCards, publicMedia } from "@/lib/public-data/queries";
import { seoMetadata } from "@/lib/public-data/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return seoMetadata("experience", "Experience", "Discover the many ways to spend time at Chatten Cafe.", "/experience"); }
export default async function ExperiencePage() { const [items, media] = await Promise.all([publicCards("experiences"), publicMedia()]); return <PublicShell><PageHero eyebrow="What visitors feel" title="Make a day of the view." description="Morning coffee, shared plates, golden-hour pauses, and conversations under Batu skies." /><main className="py-20"><div className="mx-auto max-w-7xl px-6 lg:px-12"><div className="grid gap-6 md:grid-cols-2">{items.map((item) => <a href={`/experience/${item.slug}`} className="group overflow-hidden bg-[#e8dfca]" key={item.id}><div className="h-72 overflow-hidden"><MediaImage media={media[item.image_media_id ?? ""]} alt="" sizes="(min-width: 768px) 50vw, 100vw" className="h-full transition-transform duration-500 group-hover:scale-[1.02]" /></div><div className="p-7"><h2 className="font-serif text-4xl">{item.name}</h2>{item.description ? <p className="mt-3 max-w-lg leading-7 text-[#4d5649]">{item.description}</p> : null}<span className="mt-6 inline-block border-b border-[#1e3024] pb-1 text-sm font-semibold">Explore experience</span></div></a>)}</div>{!items.length ? <p className="text-[#4d5649]">Experiences will be curated soon.</p> : null}</div></main></PublicShell>; }

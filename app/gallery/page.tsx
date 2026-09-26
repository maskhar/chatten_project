import type { Metadata } from "next";
import { MediaImage } from "@/components/public/media-image";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicGallery, publicMedia } from "@/lib/public-data/queries";
import { seoMetadata } from "@/lib/public-data/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return seoMetadata("gallery", "Gallery", "A glimpse of the changing moments at Chatten Cafe.", "/gallery"); }
export default async function GalleryPage() { const [items, media] = await Promise.all([publicGallery(), publicMedia()]); return <PublicShell><PageHero eyebrow="Framed by Batu" title="A glimpse of Chatten." description="A living collection of moments, tables, and changing light." /><div className="py-20"><div className="mx-auto max-w-7xl px-6 lg:px-12">{items.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map((item, index) => <figure className={`${index % 5 === 0 ? "md:col-span-2 md:row-span-2" : ""} min-h-52 overflow-hidden bg-moss`} key={item.id}><MediaImage media={media[item.image_media_id ?? ""]} alt={item.alt_text} sizes={index % 5 === 0 ? "(min-width: 768px) 50vw, 50vw" : "(min-width: 768px) 25vw, 50vw"} className="h-full min-h-52" /></figure>)}</div> : <div className="grid min-h-80 place-items-center bg-sand text-center"><p className="font-serif text-3xl">More views are on their way.</p></div>}</div></div></PublicShell>; }

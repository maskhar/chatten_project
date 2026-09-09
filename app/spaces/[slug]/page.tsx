import { notFound } from "next/navigation";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicCards } from "@/lib/public-data/queries";
export const dynamic = "force-dynamic";
export default async function SpaceDetail({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const item = (await publicCards("spaces")).find((entry) => entry.slug === slug); if (!item) notFound(); return <PublicShell><PageHero eyebrow="A space at Chatten" title={item.name} description={item.description ?? undefined} /><main className="mx-auto max-w-3xl px-6 py-20 lg:px-0"><p className="text-lg leading-8 text-[#596052]">{item.description ?? "Details for this space are being prepared."}</p><a href="/visit" className="mt-10 inline-block bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white">Plan Your Visit</a></main></PublicShell>; }

import { notFound } from "next/navigation";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicEvents } from "@/lib/public-data/queries";
export const dynamic = "force-dynamic";
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const event = (await publicEvents()).find((entry) => entry.slug === slug); if (!event) notFound(); return <PublicShell><PageHero eyebrow="Event at Chatten" title={event.title} description={event.summary ?? undefined} /><main className="mx-auto max-w-3xl px-6 py-20 lg:px-0"><p className="text-sm font-semibold text-[#b26043]">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(event.starts_at))}</p>{event.body ? <p className="mt-8 text-lg leading-8 text-[#596052]">{event.body}</p> : null}<a href="/visit" className="mt-10 inline-block bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white">Plan Your Visit</a></main></PublicShell>; }

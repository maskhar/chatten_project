import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicEvents } from "@/lib/public-data/queries";
import { publicMetadata } from "@/lib/seo";
export const dynamic = "force-dynamic";
export function generateMetadata(): Metadata { return publicMetadata("Events", "Discover upcoming moments at Chatten Cafe.", "/events"); }
export default async function EventsPage() { const events = await publicEvents(); return <PublicShell><PageHero eyebrow="What's happening" title="Make room for a new story." description="Gatherings, special moments, and seasonal reasons to return." /><main className="py-20"><div className="mx-auto max-w-7xl px-6 lg:px-12">{events.length ? <div className="grid gap-5 md:grid-cols-2">{events.map((event) => <a className="border border-[#c9bfa8] bg-[#ede3d0] p-7 transition-colors hover:bg-[#e4d6bc]" href={`/events/${event.slug}`} key={event.id}><p className="text-xs uppercase tracking-[.18em] text-[#b26043]">At Chatten</p><h2 className="mt-4 font-serif text-4xl">{event.title}</h2><p className="mt-4 text-sm text-[#596052]">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(event.starts_at))}</p>{event.summary ? <p className="mt-5 leading-7 text-[#596052]">{event.summary}</p> : null}</a>)}</div> : <p className="text-[#596052]">No public events are scheduled right now. Follow Chatten for future moments.</p>}</div></main></PublicShell>; }

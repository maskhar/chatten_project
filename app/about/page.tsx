import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { CtaLink } from "@/components/ui/cta";
import { publicAbout } from "@/lib/public-data/queries";
import { seoMetadata } from "@/lib/public-data/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { return seoMetadata("about", "About", "A place to eat, talk, and experience Batu.", "/about"); }
export default async function AboutPage() { const sections = await publicAbout(); return <PublicShell><PageHero eyebrow="The Chatten story" title="More than a cafe." description="A meeting point for food, conversation, and the changing atmosphere of Batu." /><main className="mx-auto max-w-5xl px-6 py-20 lg:px-12">{sections.length ? <div className="grid gap-16">{sections.map((section) => <section className="grid gap-5 border-t border-line pt-8 md:grid-cols-[.7fr_1.3fr]" key={section.id}><h2 className="font-serif text-4xl">{section.title}</h2><p className="text-lg leading-8 text-ink">{section.body}</p></section>)}</div> : <p className="max-w-2xl text-lg leading-8 text-ink">Chatten is being shaped as a destination for slow meals, long conversations, and the changing light of Batu.</p>}<CtaLink href="/experience" className="mt-14">Discover the Experience</CtaLink></main></PublicShell>; }

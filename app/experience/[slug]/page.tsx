import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicCardBySlug, publicMediaById } from "@/lib/public-data/queries";
import { publicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

// A37: every detail page shared one generic title, so search results and
// shared links were indistinguishable from each other.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await publicCardBySlug("experiences", slug);
  if (!item) return publicMetadata("Experience", "This experience could not be found.", `/experience/${slug}`);
  return publicMetadata(item.name, item.description ?? `${item.name} at Chatten Cafe.`, `/experience/${item.slug}`);
}

export default async function ExperienceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A60: one indexed lookup instead of fetching the whole collection and
  // Array.find-ing it.
  const item = await publicCardBySlug("experiences", slug);
  if (!item) notFound();
  const image = await publicMediaById(item.image_media_id);
  return (
    <PublicShell>
      {/* A38: the list cards show imagery; the detail page showed none. */}
      <PageHero eyebrow="Experience at Chatten" title={item.name} description={item.description ?? undefined} image={image} />
      <main className="mx-auto max-w-3xl px-6 py-20 lg:px-0">
        <p className="text-lg leading-8 text-[#4d5649]">{item.description ?? "This experience is being prepared for publication."}</p>
        <a href="/visit" className="mt-10 inline-block bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white">Plan Your Visit</a>
      </main>
    </PublicShell>
  );
}

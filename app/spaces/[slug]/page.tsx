import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { publicCardBySlug, publicMediaById } from "@/lib/public-data/queries";
import { publicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await publicCardBySlug("spaces", slug);
  if (!item) return publicMetadata("Space", "This space could not be found.", `/spaces/${slug}`);
  return publicMetadata(item.name, item.description ?? `${item.name} at Chatten Cafe.`, `/spaces/${item.slug}`);
}

export default async function SpaceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await publicCardBySlug("spaces", slug);
  if (!item) notFound();
  const image = await publicMediaById(item.image_media_id);
  return (
    <PublicShell>
      <PageHero eyebrow="A space at Chatten" title={item.name} description={item.description ?? undefined} image={image} />
      <main className="mx-auto max-w-3xl px-6 py-20 lg:px-0">
        <p className="text-lg leading-8 text-[#4d5649]">{item.description ?? "Details for this space are being prepared."}</p>
        <a href="/visit" className="mt-10 inline-block bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white">Plan Your Visit</a>
      </main>
    </PublicShell>
  );
}

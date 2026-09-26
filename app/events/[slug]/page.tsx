import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/public/media-image";
import { PageHero } from "@/components/public/page-hero";
import { PublicShell } from "@/components/public/public-shell";
import { CtaLink } from "@/components/ui/cta";
import { publicEventBySlug, publicMediaById } from "@/lib/public-data/queries";
import { publicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const eventDate = (iso: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(iso));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await publicEventBySlug(slug);
  if (!event) return publicMetadata("Event", "This event could not be found.", `/events/${slug}`);
  return publicMetadata(event.title, event.summary ?? `${event.title} at Chatten Cafe on ${eventDate(event.starts_at)}.`, `/events/${event.slug}`);
}

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await publicEventBySlug(slug);
  if (!event) notFound();
  const image = await publicMediaById(event.image_media_id);
  return (
    <PublicShell>
      <PageHero eyebrow="Event at Chatten" title={event.title} description={event.summary ?? undefined} image={image} />
      {/* A95: a second <MediaImage> used to render the same asset the hero is
          already showing, with `alt={image?.alt_text ?? event.title}` — so the
          one photograph appeared twice on the page, and a screen reader
          announced the event title twice in a row, once as the h1 and once as
          the duplicate's alt text. The hero keeps the image. */}
      <div className="mx-auto max-w-3xl px-6 py-20 lg:px-0">
        <p className="text-sm font-semibold text-rust">{eventDate(event.starts_at)}</p>
        {event.body ? <p className="mt-8 text-lg leading-8 text-ink">{event.body}</p> : null}
        <CtaLink href="/visit" className="mt-10">Plan Your Visit</CtaLink>
      </div>
    </PublicShell>
  );
}

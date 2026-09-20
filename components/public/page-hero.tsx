import { MediaImage } from "@/components/public/media-image";
import type { PublicMedia } from "@/lib/public-data/types";

// A43: the heights were mobile-hostile — `py-36 sm:py-44` never shrank below
// the sm breakpoint, so a phone got a nearly full-screen band of empty green
// before any content. Scaled up from a mobile base instead.
//
// A38: `image` renders a hero photo behind the text. The list cards have
// always shown imagery; the detail pages showed none.
export function PageHero({ eyebrow, title, description, image }: { eyebrow: string; title: string; description?: string; image?: PublicMedia | null }) {
  return (
    <section className="relative isolate bg-[#1f3426] py-20 text-white sm:py-32 lg:py-44">
      {/* A42: shares MediaImage with every other public surface so the focal
          point and the responsive candidates are decided in one place. The
          hero is above the fold on every detail page, hence `priority`. */}
      {image ? <MediaImage media={image} alt="" sizes="100vw" priority scrim="strong" className="absolute inset-0 -z-10" /> : null}
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <p className="text-xs uppercase tracking-[.24em] text-[#f3c4a6]">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-[.95] sm:text-6xl sm:leading-[.9] lg:text-8xl">{title}</h1>
        {description ? <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:mt-7 sm:text-lg sm:leading-8">{description}</p> : null}
      </div>
    </section>
  );
}

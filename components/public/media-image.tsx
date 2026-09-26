import Image from "next/image";
import { focalObjectPosition } from "@/lib/media/focal-point";
import { mediaHref } from "@/lib/media/url";

// A42: every public surface except the Events detail page painted its imagery
// with `style={{ backgroundImage: url(...) }}`. A CSS background is invisible
// to next/image, so a phone downloaded the full-resolution original of every
// card, moment and gallery tile — and none of them honoured the focal point
// A28 added. This is the one component all of them go through now.
//
// It owns its wrapper because `fill` needs a positioned ancestor; handing that
// responsibility to each caller is how a layout silently collapses to zero
// height. The wrapper also carries the placeholder colour, so a missing or
// unapproved asset still reserves the same space.
export type ImageMedia = {
  id: string;
  alt_text?: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
};

export function MediaImage({
  media,
  sizes,
  alt,
  className = "",
  priority = false,
  scrim = false,
}: {
  media: ImageMedia | null | undefined;
  /** Required: an <Image fill> without `sizes` serves the 100vw candidate to every viewport. */
  sizes: string;
  /** `undefined` falls back to the asset's own alt text; pass "" for decorative imagery. */
  alt?: string;
  className?: string;
  priority?: boolean;
  /**
   * The dark wash that keeps overlaid white text legible on an arbitrary
   * photo. "strong" is for a full hero heading over the image; "soft" is for
   * a card where the text sits in a panel below it.
   */
  scrim?: boolean | "soft" | "strong";
}) {
  const src = mediaHref(media);
  const label = alt ?? media?.alt_text ?? "";
  const decorative = label === "";
  // `fill` needs a positioned ancestor, so the wrapper is `relative` by
  // default — but several call sites stretch it over a section with
  // `absolute inset-0`. Both are position utilities, and which one wins is
  // decided by their order in the generated stylesheet, not by the order
  // written here, so the default is dropped when the caller supplies its own.
  const positioned = /\b(absolute|fixed|sticky|relative)\b/.test(className);
  const wrapper = `${positioned ? "" : "relative "}overflow-hidden bg-moss ${className}`;

  if (!src) return <div className={wrapper} aria-hidden="true" />;

  return (
    <div className={wrapper}>
      <Image
        src={src}
        alt={label}
        {...(decorative ? { "aria-hidden": true as const } : {})}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        style={{ objectPosition: focalObjectPosition(media) }}
      />
      {scrim ? <div aria-hidden="true" className={`absolute inset-0 bg-gradient-to-br ${scrim === "strong" ? "from-[#12211790] to-[#122117d9]" : "from-[#12211714] to-[#12211775]"}`} /> : null}
    </div>
  );
}

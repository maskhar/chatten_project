export type MediaUsageResource =
  | "hero"
  | "moment"
  | "about"
  | "experience"
  | "space"
  | "gallery"
  | "event"
  | "promotion"
  | "menu"
  | "seo";

export type MediaUsageReference = {
  mediaId: string;
  resource: MediaUsageResource;
  label: string;
  title: string;
  href?: string;
};

type ImageMediaRow = {
  image_media_id?: string | null;
  title?: string | null;
  name?: string | null;
  caption?: string | null;
  alt_text?: string | null;
};

type SeoMediaRow = {
  og_media_id?: string | null;
  page_key?: string | null;
  title?: string | null;
};

export type MediaUsageRows = {
  hero?: ImageMediaRow[];
  moments?: ImageMediaRow[];
  about?: ImageMediaRow[];
  experiences?: ImageMediaRow[];
  spaces?: ImageMediaRow[];
  gallery?: ImageMediaRow[];
  events?: ImageMediaRow[];
  promotions?: ImageMediaRow[];
  menu?: ImageMediaRow[];
  seo?: SeoMediaRow[];
};

const resourceMetadata: Record<MediaUsageResource, { label: string; fallbackTitle: string }> = {
  hero: { label: "Hero", fallbackTitle: "Hero slide" },
  moment: { label: "Moment", fallbackTitle: "Moment" },
  about: { label: "About", fallbackTitle: "About section" },
  experience: { label: "Experience", fallbackTitle: "Experience" },
  space: { label: "Space", fallbackTitle: "Space" },
  gallery: { label: "Gallery", fallbackTitle: "Gallery item" },
  event: { label: "Event", fallbackTitle: "Event" },
  promotion: { label: "Promotion", fallbackTitle: "Promotion" },
  menu: { label: "Menu", fallbackTitle: "Menu item" },
  seo: { label: "SEO", fallbackTitle: "SEO settings" },
};

function displayTitle(values: Array<string | null | undefined>, fallbackTitle: string) {
  return values.map((value) => value?.trim()).find(Boolean) ?? fallbackTitle;
}

function addImageReferences(
  usage: Map<string, MediaUsageReference[]>,
  rows: ImageMediaRow[] | undefined,
  resource: Exclude<MediaUsageResource, "seo">,
) {
  const { label, fallbackTitle } = resourceMetadata[resource];
  for (const row of rows ?? []) {
    const mediaId = row.image_media_id?.trim();
    if (!mediaId) continue;
    const reference: MediaUsageReference = {
      mediaId,
      resource,
      label,
      title: displayTitle([row.title, row.name, row.caption, row.alt_text], fallbackTitle),
    };
    usage.set(mediaId, [...(usage.get(mediaId) ?? []), reference]);
  }
}

export function buildMediaUsageMap(rows: MediaUsageRows): Map<string, MediaUsageReference[]> {
  const usage = new Map<string, MediaUsageReference[]>();
  addImageReferences(usage, rows.hero, "hero");
  addImageReferences(usage, rows.moments, "moment");
  addImageReferences(usage, rows.about, "about");
  addImageReferences(usage, rows.experiences, "experience");
  addImageReferences(usage, rows.spaces, "space");
  addImageReferences(usage, rows.gallery, "gallery");
  addImageReferences(usage, rows.events, "event");
  addImageReferences(usage, rows.promotions, "promotion");
  addImageReferences(usage, rows.menu, "menu");

  const { label, fallbackTitle } = resourceMetadata.seo;
  for (const row of rows.seo ?? []) {
    const mediaId = row.og_media_id?.trim();
    if (!mediaId) continue;
    const reference: MediaUsageReference = {
      mediaId,
      resource: "seo",
      label,
      title: displayTitle([row.title, row.page_key], fallbackTitle),
    };
    usage.set(mediaId, [...(usage.get(mediaId) ?? []), reference]);
  }

  return usage;
}

export function mediaUsageCount(usage: Map<string, MediaUsageReference[]>, mediaId: string) {
  return usage.get(mediaId)?.length ?? 0;
}

export function isMediaUsed(usage: Map<string, MediaUsageReference[]>, mediaId: string) {
  return mediaUsageCount(usage, mediaId) > 0;
}

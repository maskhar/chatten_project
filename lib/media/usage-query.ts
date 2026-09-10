import { buildMediaUsageMap, type MediaUsageRows, type MediaUsageReference } from "./usage";

type UsageQueryResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

export type MediaUsageQueryClient = {
  from(table: string): {
    select(columns: string): PromiseLike<UsageQueryResult>;
  };
};

type MediaUsageQueryDefinition = {
  key: keyof MediaUsageRows;
  table: string;
  columns: string;
};

export const mediaUsageQueryDefinitions: MediaUsageQueryDefinition[] = [
  { key: "hero", table: "hero_slides", columns: "image_media_id,title" },
  { key: "moments", table: "moments", columns: "image_media_id,name" },
  { key: "about", table: "about_sections", columns: "image_media_id,title" },
  { key: "experiences", table: "experiences", columns: "image_media_id,name" },
  { key: "spaces", table: "spaces", columns: "image_media_id,name" },
  { key: "gallery", table: "gallery_items", columns: "image_media_id,title,alt_text" },
  { key: "events", table: "events", columns: "image_media_id,title" },
  { key: "promotions", table: "promotions", columns: "image_media_id,title" },
  { key: "menu", table: "menu_items", columns: "image_media_id,name" },
  { key: "seo", table: "seo_settings", columns: "og_media_id,page_key,title" },
];

export async function loadMediaUsageMapWithClient(client: MediaUsageQueryClient): Promise<Map<string, MediaUsageReference[]>> {
  const results = await Promise.all(
    mediaUsageQueryDefinitions.map(async ({ key, table, columns }) => {
      const result = await client.from(table).select(columns);
      if (result.error) throw new Error(`Unable to load Media usage for ${table}: ${result.error.message}`);
      return [key, result.data ?? []] as const;
    }),
  );

  return buildMediaUsageMap(Object.fromEntries(results) as MediaUsageRows);
}

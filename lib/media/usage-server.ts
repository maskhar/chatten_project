import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadMediaUsageMapWithClient } from "./usage-query";
import type { MediaUsageReference } from "./usage";

export async function loadMediaUsageMap(): Promise<Map<string, MediaUsageReference[]>> {
  const supabase = await createServerSupabaseClient();
  return loadMediaUsageMapWithClient(supabase);
}

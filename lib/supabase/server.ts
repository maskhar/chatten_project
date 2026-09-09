import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";
export async function createServerSupabaseClient() { const env = getPublicEnv(); const cookieStore = await cookies(); return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { db: { schema: "chatten_cafe" }, cookies: { getAll: () => cookieStore.getAll(), setAll: (entries) => { try { entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } } }); }

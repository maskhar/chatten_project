import { z } from "zod";
const publicSchema = z.object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1) });
const serverSchema = publicSchema.extend({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(1) });
export function getPublicEnv() { return publicSchema.parse({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }); }
export function getServerEnv() { return serverSchema.parse({ ...getPublicEnv(), SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY }); }

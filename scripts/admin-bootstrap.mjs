import { createClient } from "@supabase/supabase-js";

export function parseBootstrapTarget(argv) {
  const emailIndex = argv.indexOf("--email");
  const userIdIndex = argv.indexOf("--user-id");
  const email = emailIndex >= 0 ? argv[emailIndex + 1]?.trim().toLowerCase() : undefined;
  const userId = userIdIndex >= 0 ? argv[userIdIndex + 1]?.trim() : undefined;
  if ((email && userId) || (!email && !userId) || (email && !/^\S+@\S+\.\S+$/.test(email)) || (userId && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId))) throw new Error("Usage: npm run admin:bootstrap -- (--email user@example.com | --user-id uuid)");
  return { email, userId };
}

async function main() {
  const target = parseBootstrapTarget(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server runtime configuration.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }, db: { schema: "chatten_cafe" } });
  let user;
  if (target.userId) {
    const { data, error } = await supabase.auth.admin.getUserById(target.userId);
    if (error || !data.user) throw new Error("Unable to inspect requested Auth user.");
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (error) throw new Error("Unable to inspect Auth users.");
    user = data.users.find((candidate) => candidate.email?.toLowerCase() === target.email);
    if (!user) throw new Error("No Auth user exists with that exact email.");
  }
  const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, display_name: user.user_metadata?.full_name ?? null }, { onConflict: "id" });
  if (profileError) throw new Error("Unable to synchronize profile.");
  const { error: roleError } = await supabase.from("user_roles").upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id" });
  if (roleError) throw new Error("Unable to assign super_admin role.");
  console.log("Super-admin bootstrap completed.");
}

if (process.argv[1]?.endsWith("admin-bootstrap.mjs")) main().catch((error) => { console.error(error instanceof Error ? error.message : "Bootstrap failed."); process.exitCode = 1; });
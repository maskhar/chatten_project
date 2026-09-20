"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// A30: proxy.ts already records the blocked path as `?next=`, but the form
// discarded it and always landed on /admin, so an expired session cost the
// operator their place. Only same-origin admin paths are accepted: a value
// starting with "//" or "/\" is a protocol-relative URL that browsers resolve
// to another host, which would turn the login screen into an open redirect.
function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/admin")) return "/admin";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/admin";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string>();
  // A23: the button gave no feedback while the network round-trip was in
  // flight, so a slow sign-in invited repeated submits.
  const [pending, startTransition] = useTransition();

  async function submit(formData: FormData) {
    setError(undefined);
    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });
    if (signInError) { setError("Sign-in failed. Check credentials."); return; }
    const destination = safeNext(params.get("next"));
    startTransition(() => { router.replace(destination); router.refresh(); });
  }

  return (
    <form action={submit} className="mt-8 grid max-w-sm gap-4">
      <label>Email<input required disabled={pending} name="email" type="email" autoComplete="email" className="mt-1 block w-full border border-[#ded1b8] bg-white px-3 py-2 disabled:opacity-60" /></label>
      <label>Password<input required disabled={pending} name="password" type="password" autoComplete="current-password" className="mt-1 block w-full border border-[#ded1b8] bg-white px-3 py-2 disabled:opacity-60" /></label>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

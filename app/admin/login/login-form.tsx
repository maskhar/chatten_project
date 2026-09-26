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

// A77. `requireAdmin` redirects here with `?error=unauthorized` when the
// password was accepted but the account has no row in `user_roles`. The form
// never read that parameter, so the sign-in appeared to silently fail: the
// operator was returned to a blank login screen with no message, and retrying
// the same correct password could only produce the same result.
//
// These two states need different words because they need different actions —
// one is "check what you typed", the other is "your credentials are fine, ask
// an administrator for access". "Sign-in failed. Check credentials." was wrong
// for the second, and sent people to re-type a password that already worked.
function initialError(reason: string | null) {
  if (reason === "unauthorized") {
    return "Masuk berhasil, tetapi akun ini belum memiliki akses CMS. Minta administrator memberi peran untuk akun Anda, lalu masuk kembali.";
  }
  if (reason === "forbidden") {
    return "Akun Anda tidak memiliki izin untuk halaman itu.";
  }
  return undefined;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | undefined>(() => initialError(params.get("error")));
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
    if (signInError) {
      // Supabase returns "Invalid login credentials" for both a wrong password
      // and an unknown email, deliberately — distinguishing them would let an
      // attacker enumerate accounts. The copy stays vague for the same reason,
      // but says which two things to check rather than just "check credentials".
      setError("Email dan kata sandi tidak cocok. Periksa keduanya lalu coba lagi.");
      return;
    }
    const destination = safeNext(params.get("next"));
    startTransition(() => { router.replace(destination); router.refresh(); });
  }

  return (
    <form action={submit} className="mt-8 grid max-w-sm gap-4">
      <label>Email<input required disabled={pending} name="email" type="email" autoComplete="email" className="mt-1 block w-full border border-sand-deep bg-white px-3 py-2 disabled:opacity-60" /></label>
      <label>Kata sandi<input required disabled={pending} name="password" type="password" autoComplete="current-password" className="mt-1 block w-full border border-sand-deep bg-white px-3 py-2 disabled:opacity-60" /></label>
      {error ? <p role="alert" className="border-l-4 border-terracotta bg-blush px-3 py-2 text-sm text-rust">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Sedang masuk…" : "Masuk"}</Button>
    </form>
  );
}

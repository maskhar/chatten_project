"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
export function LoginForm() { const router = useRouter(); const [error, setError] = useState<string>(); async function submit(formData: FormData) { setError(undefined); const supabase = createBrowserSupabaseClient(); const { error: signInError } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) }); if (signInError) { setError("Sign-in failed. Check credentials."); return; } router.replace("/admin"); router.refresh(); } return <form action={submit} className="mt-8 grid max-w-sm gap-4"><label>Email<input required name="email" type="email" className="mt-1 block w-full border border-[#ded1b8] bg-white px-3 py-2" /></label><label>Password<input required name="password" type="password" className="mt-1 block w-full border border-[#ded1b8] bg-white px-3 py-2" /></label>{error ? <p className="text-sm text-red-700">{error}</p> : null}<Button type="submit">Sign in</Button></form>; }

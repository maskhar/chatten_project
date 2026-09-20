import { requireAdmin } from "@/lib/auth/require-admin";
import { signOut } from "@/lib/admin/actions";
export default async function AccountPage() { const user = await requireAdmin(); return <section><p className="text-xs uppercase tracking-[.2em] text-[#b26043]">System</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl">Account</h1><p className="mt-6 text-[#596052]">Signed in as {user.email}</p><form className="mt-8" action={signOut}><button className="bg-[#1f3426] px-5 py-3 text-sm font-semibold text-white" type="submit">Sign out</button></form></section>; }

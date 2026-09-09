import { requireAdmin } from "@/lib/auth/require-admin";
import { Container } from "@/components/ui/container";
export const dynamic = "force-dynamic";
export default async function AdminPage() { const user = await requireAdmin(); return <main className="min-h-screen py-16"><Container><p className="text-sm text-[#b75e42]">Authenticated admin foundation</p><h1 className="mt-3 text-4xl" style={{ fontFamily: "var(--font-display)" }}>Chatten CMS</h1><p className="mt-4">Signed in as {user.email}. CMS CRUD arrives in Phase 4.</p></Container></main>; }

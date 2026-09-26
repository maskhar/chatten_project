import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { addCmsUser, removeRole, saveRole } from "@/lib/admin/role-actions";
import { SubmitButton } from "@/components/admin/submit-button";
export const dynamic = "force-dynamic";
const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  editor: "Editor",
};

// A87: writing a super_admin row requires already being one, enforced by the
// restrictive policies in 20260926000200 and mirrored in role-actions.ts. The
// option stays rendered but disabled for an admin so an existing super_admin
// row still displays its own value — removing the option would make the select
// fall back to Editor and read as a pending demotion that the database refuses.
// Each control is enabled only when the corresponding action can actually
// succeed, so the screen stops offering moves the server already refuses:
//  * an existing super_admin row is fully locked for an admin (saveRole and
//    removeRole refuse it, and so do the restrictive UPDATE/DELETE policies);
//  * a super_admin cannot demote themselves ("Super admin tidak dapat melepas
//    proteksi dirinya sendiri.");
//  * nobody can remove their own role ("Anda tidak dapat menghapus peran Anda
//    sendiri.");
//  * only a super_admin may add a CMS user at all ("Hanya super admin yang
//    dapat menambah pengguna CMS.").
// The guards stay in role-actions.ts — this is the screen matching them, not
// replacing them.
function RoleOptions({ canManageSuper }: { canManageSuper: boolean }) {
  return <><option value="editor">Editor</option><option value="admin">Admin</option><option value="super_admin" disabled={!canManageSuper}>Super admin</option></>;
}

export default async function UsersPage() { const viewer = await requireAdmin("admin"); const canManageSuper = viewer.cmsRole === "super_admin"; const supabase = createServiceRoleSupabaseClient(); const { data: roles } = await supabase.from("user_roles").select("user_id,role").order("created_at"); const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 }); const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? "Identitas tidak tersedia"])); const members = (roles ?? []).map((role) => ({ id: String(role.user_id), role: String(role.role), email: emailById.get(String(role.user_id)) ?? "Identitas tidak tersedia" })); return <section><p className="text-xs uppercase tracking-[.2em] text-rust">Sistem</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl">Pengguna &amp; Peran</h1><p className="mt-5 max-w-2xl text-ink">Kelola keanggotaan CMS Chatten saja. Akun autentikasi tetap dikelola melalui Supabase Auth.</p><p className="mt-2 max-w-2xl text-sm text-ink-muted">Admin dapat mengatur peran Editor dan Admin yang sudah ada. Hanya Super admin yang dapat menambah pengguna CMS atau mengelola peran Super admin.</p><form action={addCmsUser} className="mt-10 grid gap-3 border border-line bg-sand p-6 sm:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-semibold">UUID pengguna<input name="user_id" required disabled={!canManageSuper} className="mt-1 w-full border border-line bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"/><span className="mt-1 block text-xs font-normal text-ink-muted">Salin dari dasbor Supabase Auth pada Authentication / Users.</span></label><label className="text-sm font-semibold">Email<input name="email" type="email" disabled={!canManageSuper} className="mt-1 w-full border border-line bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"/><span className="mt-1 block text-xs font-normal text-ink-muted">Opsional. Dipakai untuk memastikan identitas akun.</span></label><label className="text-sm font-semibold">Peran<select name="role" defaultValue="editor" disabled={!canManageSuper} className="mt-1 w-full border border-line bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"><RoleOptions canManageSuper={canManageSuper}/></select>{canManageSuper ? null : <span className="mt-1 block text-xs font-normal text-ink-muted">Hanya Super admin yang dapat menambah pengguna CMS.</span>}</label><SubmitButton className="h-fit self-end bg-forest px-4 py-2 text-white" pendingLabel="Menambahkan…" disabled={!canManageSuper}>Tambah pengguna CMS</SubmitButton></form><div className="mt-10 overflow-x-auto border border-line bg-sand"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-line"><th className="p-4">Pengguna</th><th className="p-4">Peran saat ini</th><th className="p-4">Tetapkan</th><th className="p-4">Hapus</th></tr></thead><tbody>{members.map((user) => { const isSelf = user.id === viewer.id; const touchesSuper = user.role === "super_admin" && !canManageSuper; const canAssign = !touchesSuper && !(isSelf && canManageSuper); const canRemove = !touchesSuper && !isSelf; return <tr className="border-b border-line last:border-0" key={user.id}><td className="p-4 break-words">{user.email}</td><td className="p-4">{roleLabels[user.role] ?? user.role}</td><td className="p-4"><form action={saveRole} className="flex flex-wrap gap-2"><input type="hidden" name="user_id" value={user.id}/><select className="border border-line bg-white px-2 py-1" name="role" defaultValue={user.role} disabled={!canAssign}><RoleOptions canManageSuper={canManageSuper}/></select><SubmitButton className="bg-forest px-3 py-1 text-white" disabled={!canAssign}>Simpan</SubmitButton></form></td><td className="p-4"><form action={removeRole}><input type="hidden" name="user_id" value={user.id}/><SubmitButton className="text-red-800 underline" pendingLabel="Menghapus…" disabled={!canRemove}>Hapus peran</SubmitButton></form></td></tr>; })}</tbody></table></div></section>; }
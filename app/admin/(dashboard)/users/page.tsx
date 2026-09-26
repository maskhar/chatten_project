import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { addCmsUser, removeRole, saveRole } from "@/lib/admin/role-actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { ROW_ACTION_DANGER, ROW_ACTION_PRIMARY, TAP_TARGET } from "@/components/ui/control";
export const dynamic = "force-dynamic";
const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  editor: "Editor",
};

const field = "mt-1 min-h-11 w-full border border-line bg-white px-3 disabled:cursor-not-allowed disabled:opacity-60";

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

// A92. Ini tabel data satu-satunya di CMS, dan tidak ada satu pun penanda yang
// memberi tahu pembaca layar apa isinya:
//
//   * tanpa `<caption>`, tabel hanya berbunyi "table, 4 columns" — judul
//     halaman tidak dibacakan ulang saat kursor masuk ke tabel;
//   * tanpa `scope`, sel header tidak terikat pada kolomnya, sehingga membaca
//     satu sel tidak menyebutkan kolom mana yang sedang dibaca. Pada tabel peran
//     itu persis informasi yang menentukan: "Admin" di kolom "Peran saat ini"
//     dan "Admin" di kolom "Tetapkan" adalah dua hal yang berbeda;
//   * baris diidentifikasi oleh email, tetapi selnya `<td>`, jadi tidak ada
//     header baris;
//   * wadah `overflow-x-auto` dapat digulir sementara tidak dapat difokuskan,
//     sehingga pengguna papan tombol tidak bisa menggulirnya sama sekali. Ia
//     kini `<div role="region">` yang dapat difokuskan dan bernama.
//
// Kontrol per baris juga di bawah 44px (`px-2 py-1`, dan tombol hapus hanya
// teks bergaris bawah dengan `text-red-800` mentah), jadi semuanya dipindahkan
// ke kelas bersama di components/ui/control.ts.
export default async function UsersPage() {
  const viewer = await requireAdmin("admin");
  const canManageSuper = viewer.cmsRole === "super_admin";
  const supabase = createServiceRoleSupabaseClient();
  const { data: roles } = await supabase.from("user_roles").select("user_id,role").order("created_at");
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? "Identitas tidak tersedia"]));
  const members = (roles ?? []).map((role) => ({ id: String(role.user_id), role: String(role.role), email: emailById.get(String(role.user_id)) ?? "Identitas tidak tersedia" }));
  return (
    <section>
      <p className="text-xs uppercase tracking-[.2em] text-rust">Sistem</p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl lg:text-6xl">Pengguna &amp; Peran</h1>
      <p className="mt-5 max-w-2xl text-ink">Kelola keanggotaan CMS Chatten saja. Akun autentikasi tetap dikelola melalui Supabase Auth.</p>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">Admin dapat mengatur peran Editor dan Admin yang sudah ada. Hanya Super admin yang dapat menambah pengguna CMS atau mengelola peran Super admin.</p>

      <h2 className="mt-10 font-serif text-2xl sm:text-3xl">Tambah pengguna CMS</h2>
      <form action={addCmsUser} aria-label="Tambah pengguna CMS" className="mt-4 grid gap-3 border border-line bg-sand p-6 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">UUID pengguna<input name="user_id" required disabled={!canManageSuper} className={field} /><span className="mt-1 block text-xs font-normal text-ink-muted">Salin dari dasbor Supabase Auth pada Authentication / Users.</span></label>
        <label className="text-sm font-semibold">Email<input name="email" type="email" disabled={!canManageSuper} className={field} /><span className="mt-1 block text-xs font-normal text-ink-muted">Opsional. Dipakai untuk memastikan identitas akun.</span></label>
        <label className="text-sm font-semibold">Peran<select name="role" defaultValue="editor" disabled={!canManageSuper} className={field}><RoleOptions canManageSuper={canManageSuper} /></select>{canManageSuper ? null : <span className="mt-1 block text-xs font-normal text-ink-muted">Hanya Super admin yang dapat menambah pengguna CMS.</span>}</label>
        <SubmitButton className={`${TAP_TARGET} h-fit self-end justify-center bg-forest px-4 font-semibold text-white`} pendingLabel="Menambahkan…" disabled={!canManageSuper}>Tambah pengguna CMS</SubmitButton>
      </form>

      <h2 className="mt-10 font-serif text-2xl sm:text-3xl">Anggota CMS</h2>
      {/* Wadah yang dapat digulir harus dapat difokuskan, bila tidak isi yang
          terpotong tidak dapat dijangkau dengan papan tombol sama sekali. */}
      <div
        role="region"
        aria-label="Anggota CMS dan perannya"
        tabIndex={0}
        className="mt-4 overflow-x-auto border border-line bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="px-4 py-3 text-left text-sm text-ink-muted">
            Setiap baris adalah satu anggota CMS. Kontrol yang dinonaktifkan menandai perubahan yang memang ditolak server.
          </caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="p-4">Pengguna</th>
              <th scope="col" className="p-4">Peran saat ini</th>
              <th scope="col" className="p-4">Tetapkan</th>
              <th scope="col" className="p-4">Hapus</th>
            </tr>
          </thead>
          <tbody>
            {members.map((user) => {
              const isSelf = user.id === viewer.id;
              const touchesSuper = user.role === "super_admin" && !canManageSuper;
              const canAssign = !touchesSuper && !(isSelf && canManageSuper);
              const canRemove = !touchesSuper && !isSelf;
              const roleLabel = roleLabels[user.role] ?? user.role;
              return (
                <tr className="border-b border-line last:border-0" key={user.id}>
                  <th scope="row" className="p-4 break-words text-left font-medium">{user.email}</th>
                  <td className="p-4">{roleLabel}</td>
                  <td className="p-4">
                    <form action={saveRole} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="user_id" value={user.id} />
                      {/* Setiap kontrol per baris menyebut barisnya sendiri:
                          di luar konteks tabel, "Simpan" tidak memberi tahu
                          pembaca layar peran siapa yang disimpan. */}
                      <select className="min-h-11 border border-line bg-white px-3 disabled:cursor-not-allowed disabled:opacity-60" name="role" defaultValue={user.role} disabled={!canAssign} aria-label={`Peran untuk ${user.email}`}><RoleOptions canManageSuper={canManageSuper} /></select>
                      <SubmitButton className={ROW_ACTION_PRIMARY} disabled={!canAssign} aria-label={`Simpan peran untuk ${user.email}`}>Simpan</SubmitButton>
                    </form>
                  </td>
                  <td className="p-4">
                    <form action={removeRole}>
                      <input type="hidden" name="user_id" value={user.id} />
                      <SubmitButton className={ROW_ACTION_DANGER} pendingLabel="Menghapus…" disabled={!canRemove} aria-label={`Hapus peran ${roleLabel} dari ${user.email}`}>Hapus peran</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

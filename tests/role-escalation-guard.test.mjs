import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// A87: `role_manage` was the only write policy on chatten_cafe.user_roles, and
// its predicate is has_role('admin') — true for an admin as well as a
// super_admin. One predicate for the whole table means an admin could PATCH
// /rest/v1/user_roles and set role = 'super_admin' on their own row. The server
// action refused it; the database did not, and the session token works without
// the server action.
//
// These tests pin the database-level guard and the app-level messages that
// mirror it, so removing either side fails here instead of silently restoring
// the escalation path.

const guard = fs.readFileSync("supabase/migrations/20260926000200_restrict_super_admin_role_writes.sql", "utf8");
const initial = fs.readFileSync("supabase/migrations/20260909000100_initial_chatten_cafe.sql", "utf8");
const roleActions = fs.readFileSync("lib/admin/role-actions.ts", "utf8");
const usersPage = fs.readFileSync("app/admin/(dashboard)/users/page.tsx", "utf8");

test("the flaw this migration closes is still the flaw in the schema it inherits", () => {
  // If role_manage is ever narrowed at its source, the restrictive policies
  // below become belt-and-braces rather than the boundary — worth knowing.
  assert.match(
    initial,
    /create policy role_manage on chatten_cafe\.user_roles for all to authenticated using \(chatten_cafe\.has_role\('admin'\)\) with check \(chatten_cafe\.has_role\('admin'\)\)/,
  );
  // has_role('admin') is satisfied by super_admin too, which is what made the
  // single predicate insufficient.
  assert.match(initial, /role = required_role or role = 'super_admin'/);
});

test("all three write commands are guarded, and only writes", () => {
  for (const command of ["for insert", "for update", "for delete"]) {
    assert.match(guard, new RegExp(`as restrictive\\s+${command} to authenticated`), `no restrictive policy ${command}`);
  }
  // A restrictive FOR ALL (or FOR SELECT) policy would hide super_admin rows
  // from an admin session, and role-actions.ts reads the target's stored role
  // through the RLS-bound client before deciding. A hidden row would read as
  // "no super_admin to protect" and take the permissive branch.
  assert.ok(!/as restrictive\s+for all/.test(guard), "a restrictive FOR ALL policy would also hide rows from SELECT");
  assert.ok(!/as restrictive\s+for select/.test(guard), "read access must stay untouched");
});

test("the predicate is the same on every command and both sides of UPDATE", () => {
  const predicate = /\(role <> 'super_admin' or chatten_cafe\.has_role\('super_admin'\)\)/g;
  // insert: with check. update: using + with check. delete: using. Four total.
  assert.equal((guard.match(predicate) ?? []).length, 4, "the guard predicate count changed");
  // USING sees the pre-image (an admin may not edit an existing super_admin),
  // WITH CHECK the post-image (an admin may not promote anyone to one). An
  // UPDATE policy with only one of them leaves half the hole open.
  const update = guard.slice(guard.indexOf("super_admin_update_guard"));
  assert.match(update, /using \(role <> 'super_admin'[\s\S]*with check \(role <> 'super_admin'/);
});

test("the guard narrows without disabling RLS or widening any grant", () => {
  assert.ok(!/disable row level security/i.test(guard));
  // Documentation may say "grant" while explaining why no grants changed;
  // executable GRANT statements are the thing that would widen a boundary.
  assert.ok(!/^\s*grant\s+/im.test(guard), "the guard migration grants something");
  assert.ok(!/^\s*(?:grant|revoke)\s+.*\banon\b/im.test(guard), "the guard migration changes anon access");
  // role_manage and own_role keep deciding what they already decided.
  assert.ok(!/drop policy if exists role_manage/.test(guard));
  assert.ok(!/drop policy if exists own_role/.test(guard));
  // Each new policy is dropped before creation so the migration is re-runnable.
  for (const name of ["super_admin_insert_guard", "super_admin_update_guard", "super_admin_delete_guard"]) {
    assert.match(guard, new RegExp(`drop policy if exists ${name} on chatten_cafe\\.user_roles`), `${name} is not re-runnable`);
  }
});

test("restrictive is the only shape that can take access away here", () => {
  // Permissive policies are OR'd, so a second permissive policy would widen
  // access and leave role_manage sufficient on its own. The word matters.
  assert.match(guard, /as restrictive/);
  assert.equal((guard.match(/as restrictive/g) ?? []).length, 3);
});

test("the last-super-admin trigger is a different guard and is left alone", () => {
  // protect_last_super_admin answers "may the final super_admin disappear".
  // These policies answer "who may touch a super_admin row at all".
  assert.ok(!/protect_last_super_admin/.test(guard.replace(/^--.*$/gm, "")), "the guard migration alters the trigger");
  const trigger = fs.readFileSync("supabase/migrations/20260909000300_protect_last_super_admin.sql", "utf8");
  assert.match(trigger, /create constraint trigger protect_last_super_admin/);
});

test("the Users & Roles UI mirrors the database boundary", () => {
  // Rendering the value as a disabled option preserves a selected existing
  // super_admin row. Removing it would falsely render that row as Editor.
  assert.match(usersPage, /function RoleOptions\(\{ canManageSuper \}/);
  assert.match(usersPage, /value="super_admin" disabled=\{!canManageSuper\}/);
  assert.match(usersPage, /const touchesSuper = user\.role === "super_admin" && !canManageSuper/);
  assert.match(usersPage, /const canAssign = !touchesSuper && !\(isSelf && canManageSuper\)/);
  assert.match(usersPage, /const canRemove = !touchesSuper && !isSelf/);
  assert.match(usersPage, /disabled=\{!canAssign\}/);
  assert.match(usersPage, /disabled=\{!canRemove\}/);
  assert.match(usersPage, /Hanya Super admin yang dapat menambah pengguna CMS\./);
  assert.match(usersPage, /pendingLabel="Menambahkan…" disabled=\{!canManageSuper\}/);
  // Viewer role comes from RLS-bound requireAdmin, never from service-role data.
  assert.match(usersPage, /const viewer = await requireAdmin\("admin"\)/);
  assert.match(usersPage, /const canManageSuper = viewer\.cmsRole === "super_admin"/);
});

test("the application layer still refuses the same three moves", () => {
  // The database is now the boundary, but the app keeps its messages: an
  // operator gets a sentence in Indonesian instead of an opaque 42501.
  for (const message of [
    "Hanya super admin yang dapat memberikan peran super admin.",
    "Hanya super admin yang dapat mengubah peran super admin.",
    "Hanya super admin yang dapat menghapus super admin.",
  ]) {
    assert.ok(roleActions.includes(message), `role-actions.ts no longer says "${message}"`);
  }
  // Those refusals are only meaningful if the caller's own role is re-read at
  // decision time rather than trusted from the session.
  assert.match(roleActions, /async function currentRole/);
  assert.match(roleActions, /async function storedRole/);
});

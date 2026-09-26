-- Audit remediation A87.
--
-- chatten_cafe.user_roles carried a single write policy:
--
--   create policy role_manage on chatten_cafe.user_roles for all to authenticated
--     using (chatten_cafe.has_role('admin')) with check (chatten_cafe.has_role('admin'));
--
-- chatten_cafe.has_role('admin') is true for an `admin` *and* for a
-- `super_admin` (it ORs `role = 'super_admin'` into every branch), so that one
-- predicate is the whole boundary: any admin session may write any row of the
-- table, including its own, with any value the CHECK constraint accepts. An
-- admin holding nothing but a valid access token can therefore POST/PATCH
-- straight to PostgREST and set `role = 'super_admin'` on themselves.
--
-- lib/admin/role-actions.ts already refuses this ("Hanya super admin yang
-- dapat memberikan peran super admin.", "Hanya super admin yang dapat mengubah
-- peran super admin.", "Hanya super admin yang dapat menghapus super admin."),
-- but those are checks in a server action, not in the database. The CMS is not
-- the only way to reach the table — the same session cookie works against
-- /rest/v1/user_roles — so the app-layer guard was bypassable and the
-- privilege boundary was effectively "admin == super_admin". Verified live on
-- 2026-09-26 with a throwaway admin account: the self-promotion PATCH returned
-- 200 and one affected row.
--
-- The fix is a database-level rule, not another UI check.
--
-- Why RESTRICTIVE policies. Permissive policies are OR'd together, so adding
-- another `create policy ... for all ...` would *widen* access, never narrow
-- it: role_manage would still allow the write on its own. Restrictive policies
-- are AND'd with the permissive result, which is the only shape that can take
-- something away from an existing policy without dropping it. role_manage and
-- own_role are therefore left exactly as they are, and each stays responsible
-- for what it already decided.
--
-- Why three per-command policies instead of one FOR ALL. A restrictive FOR ALL
-- policy also constrains SELECT, which would hide super_admin rows from an
-- admin session. role-actions.ts reads the *target's* stored role through the
-- RLS-bound client before deciding (`storedRole`); if that read returned no
-- row, the action would conclude "this user has no super_admin to protect" and
-- take the permissive branch. Hiding the row would make the app-layer message
-- wrong, so read access is deliberately untouched — only writes are narrowed.
--
-- Semantics of the predicate, per command:
--  * INSERT — WITH CHECK sees the proposed row: granting super_admin to anyone
--    (including oneself) now requires already being one.
--  * UPDATE — USING sees the pre-image, WITH CHECK the post-image. Both are
--    required: USING stops an admin editing an existing super_admin's row,
--    WITH CHECK stops an admin promoting any row to super_admin. Self-
--    promotion fails on WITH CHECK; taking over a super_admin fails on USING.
--  * DELETE — USING only: an admin cannot remove a super_admin's role row.
--
-- A PostgREST upsert is INSERT ... ON CONFLICT DO UPDATE, so it is checked by
-- the INSERT policy and, on conflict, by the UPDATE policy. Both are present,
-- which is what `saveRole`/`addCmsUser` actually execute.
--
-- `role` is NOT NULL (see the CHECK constraint in
-- 20260909000100_initial_chatten_cafe.sql), so `role <> 'super_admin'` cannot
-- evaluate to NULL and silently fail closed on a legitimate write.
--
-- What is intentionally NOT changed:
--  * A super_admin keeps full write access — has_role('super_admin') is true
--    for them, so every predicate below short-circuits to true.
--  * An admin keeps full write access to `admin` and `editor` rows, which is
--    the day-to-day membership work the Users & Roles screen exists for.
--  * protect_last_super_admin (20260909000300) still guards the final
--    super_admin against a super_admin removing themselves. These policies
--    answer "who may touch a super_admin row", the trigger answers "may the
--    last one disappear". They are different questions.
--  * No grant changes, no RLS disabled, nothing widened for anon or
--    authenticated.

drop policy if exists super_admin_insert_guard on chatten_cafe.user_roles;
create policy super_admin_insert_guard on chatten_cafe.user_roles
  as restrictive
  for insert to authenticated
  with check (role <> 'super_admin' or chatten_cafe.has_role('super_admin'));

drop policy if exists super_admin_update_guard on chatten_cafe.user_roles;
create policy super_admin_update_guard on chatten_cafe.user_roles
  as restrictive
  for update to authenticated
  using (role <> 'super_admin' or chatten_cafe.has_role('super_admin'))
  with check (role <> 'super_admin' or chatten_cafe.has_role('super_admin'));

drop policy if exists super_admin_delete_guard on chatten_cafe.user_roles;
create policy super_admin_delete_guard on chatten_cafe.user_roles
  as restrictive
  for delete to authenticated
  using (role <> 'super_admin' or chatten_cafe.has_role('super_admin'));

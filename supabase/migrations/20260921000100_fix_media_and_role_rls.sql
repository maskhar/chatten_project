-- Audit remediation A2 + A3.
--
-- A2: chatten_cafe.user_roles only had role_manage (requires has_role('admin')),
-- so lib/auth/require-admin.ts — which reads the table with the RLS-bound
-- session client — returned zero rows for an editor. Every editor account was
-- redirected to /admin/login?error=unauthorized and could never enter the CMS.
-- Policies are permissive and OR'd, so adding a self-select policy does not
-- weaken role_manage: an editor still cannot read or write anyone else's row.
--
-- A3: chatten_cafe.media was omitted from the public_content policy list in
-- 20260909000100_initial_chatten_cafe.sql; only cms_manage (editor) existed.
-- Anonymous visitors therefore received zero media rows and every CMS-managed
-- image on the public site resolved to nothing. Public read is limited to
-- rights_status = 'approved', matching what the application already enforces
-- before allowing content that references a media row to be published.

create policy own_role on chatten_cafe.user_roles
  for select to authenticated
  using (user_id = auth.uid());

create policy public_media on chatten_cafe.media
  for select
  using (rights_status = 'approved');

-- Audit remediation A9.
--
-- site_settings, seo_settings, navigation_items, social_links, and
-- contact_information are site-wide configuration (SEO metadata, primary
-- nav, footer social links, address/phone/map embed), not day-to-day content
-- like events or gallery items. Their cms_manage policy allowed any
-- has_role('editor') member (editor, admin, or super_admin) full write
-- access, same as ordinary content tables. Tighten to has_role('admin')
-- (admin or super_admin only); editors keep read via the existing
-- public_site / public_content policies plus everyone's implicit ability to
-- read published rows.
--
-- has_role() OR's its branches (editor/admin/super_admin, admin/super_admin,
-- or exact match — see chatten_cafe.has_role), so replacing 'editor' with
-- 'admin' here removes only the editor branch; admin and super_admin are
-- unaffected. Mirrored at the application layer by
-- lib/admin/resources.ts:minRoleFor() and its callers in
-- lib/admin/actions.ts (A9) and app/admin/(dashboard)/[resource]/page.tsx.

drop policy cms_manage on chatten_cafe.site_settings;
create policy cms_manage on chatten_cafe.site_settings
  for all to authenticated
  using (chatten_cafe.has_role('admin'))
  with check (chatten_cafe.has_role('admin'));

drop policy cms_manage on chatten_cafe.seo_settings;
create policy cms_manage on chatten_cafe.seo_settings
  for all to authenticated
  using (chatten_cafe.has_role('admin'))
  with check (chatten_cafe.has_role('admin'));

drop policy cms_manage on chatten_cafe.navigation_items;
create policy cms_manage on chatten_cafe.navigation_items
  for all to authenticated
  using (chatten_cafe.has_role('admin'))
  with check (chatten_cafe.has_role('admin'));

drop policy cms_manage on chatten_cafe.social_links;
create policy cms_manage on chatten_cafe.social_links
  for all to authenticated
  using (chatten_cafe.has_role('admin'))
  with check (chatten_cafe.has_role('admin'));

drop policy cms_manage on chatten_cafe.contact_information;
create policy cms_manage on chatten_cafe.contact_information
  for all to authenticated
  using (chatten_cafe.has_role('admin'))
  with check (chatten_cafe.has_role('admin'));

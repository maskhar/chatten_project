create or replace function chatten_cafe.prevent_last_super_admin_removal() returns trigger language plpgsql security definer set search_path = chatten_cafe, public as $$
declare remaining integer;
begin
  if (tg_op = 'DELETE' and old.role = 'super_admin') or (tg_op = 'UPDATE' and old.role = 'super_admin' and new.role <> 'super_admin') then
    perform pg_advisory_xact_lock(hashtextextended('chatten_cafe.super_admin_guard', 0));
    select count(*) into remaining from chatten_cafe.user_roles where role = 'super_admin' and user_id <> old.user_id;
    if remaining < 1 then raise exception 'Cannot remove the last super_admin'; end if;
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists protect_last_super_admin on chatten_cafe.user_roles;
create constraint trigger protect_last_super_admin after update or delete on chatten_cafe.user_roles deferrable initially immediate for each row execute procedure chatten_cafe.prevent_last_super_admin_removal();

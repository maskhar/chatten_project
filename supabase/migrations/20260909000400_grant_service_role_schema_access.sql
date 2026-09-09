grant usage on schema chatten_cafe to service_role;
grant select, insert, update, delete on all tables in schema chatten_cafe to service_role;
grant usage, select on all sequences in schema chatten_cafe to service_role;
alter default privileges in schema chatten_cafe grant select, insert, update, delete on tables to service_role;
alter default privileges in schema chatten_cafe grant usage, select on sequences to service_role;
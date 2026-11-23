-- Replace the example address with the ERP administrator's address.
insert into ambs_erp.members (email, role)
values (lower('admin@example.com'), 'admin')
on conflict (email) do update set role = excluded.role, enabled = true;

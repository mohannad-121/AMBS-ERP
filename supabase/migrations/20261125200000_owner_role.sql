-- Owner (super admin): sees everything an admin sees, plus the owner overview of each employee's work.
alter table ambs_erp.members drop constraint members_role_check;
alter table ambs_erp.members add constraint members_role_check check (role in ('owner', 'admin', 'staff'));
-- Display name shown in team activity (falls back to the email).
alter table ambs_erp.members add column if not exists name text;

create or replace function public.ambs_erp_read(p_email text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('revision', w.revision, 'snapshot', w.snapshot, 'role', m.role, 'name', m.name)
    from ambs_erp.workspace w cross join ambs_erp.members m
    where w.id and m.email = lower(p_email) and m.enabled;
$$;

create or replace function public.ambs_erp_write(p_email text,p_actor uuid,p_expected integer,p_snapshot jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare next_revision integer;
begin
  update ambs_erp.workspace
     set revision = revision + 1, snapshot = p_snapshot, updated_at = now()
   where id and revision = p_expected
     and exists (select 1 from ambs_erp.members where email = lower(p_email) and enabled
       and (snapshot is not null or role in ('admin', 'owner')))
   returning revision into next_revision;
  if next_revision is not null then
    insert into ambs_erp.audit(revision,actor) values(next_revision,p_actor);
  end if;
  return next_revision;
end;
$$;

create schema if not exists ambs_erp;
revoke all on schema ambs_erp from public, anon, authenticated;
grant usage on schema ambs_erp to service_role;

create table ambs_erp.members (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('admin', 'staff')),
  enabled boolean not null default true
);
create table ambs_erp.workspace (
  id boolean primary key default true check (id),
  revision integer not null default 0 check (revision >= 0),
  snapshot jsonb,
  updated_at timestamptz not null default now()
);
create table ambs_erp.audit (
  revision integer primary key,
  actor uuid not null,
  recorded_at timestamptz not null default now()
);
alter table ambs_erp.members enable row level security;
alter table ambs_erp.workspace enable row level security;
alter table ambs_erp.audit enable row level security;
revoke all on all tables in schema ambs_erp from public, anon, authenticated;
grant select on ambs_erp.members, ambs_erp.workspace to service_role;
grant update on ambs_erp.workspace to service_role;
grant insert on ambs_erp.audit to service_role;
insert into ambs_erp.workspace default values;

create function public.ambs_erp_member(p_email text)
returns text language sql stable security invoker set search_path = ''
as $$
  select role from ambs_erp.members where email = lower(p_email) and enabled;
$$;
create function public.ambs_erp_read(p_email text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object('revision', w.revision, 'snapshot', w.snapshot, 'role', m.role)
    from ambs_erp.workspace w cross join ambs_erp.members m
    where w.id and m.email = lower(p_email) and m.enabled;
$$;
create function public.ambs_erp_write(p_email text,p_actor uuid,p_expected integer,p_snapshot jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare next_revision integer;
begin
  update ambs_erp.workspace
     set revision = revision + 1, snapshot = p_snapshot, updated_at = now()
   where id and revision = p_expected
     and exists (select 1 from ambs_erp.members where email = lower(p_email) and enabled
       and (snapshot is not null or role = 'admin'))
   returning revision into next_revision;
  if next_revision is not null then
    insert into ambs_erp.audit(revision,actor) values(next_revision,p_actor);
  end if;
  return next_revision;
end;
$$;
revoke all on function public.ambs_erp_member(text),public.ambs_erp_read(text),public.ambs_erp_write(text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.ambs_erp_member(text),public.ambs_erp_read(text),public.ambs_erp_write(text,uuid,integer,jsonb) to service_role;

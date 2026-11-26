-- Unsaved form drafts, one row per signed-in employee, so a half-filled form follows them to any device.
create table if not exists ambs_erp.drafts (
  email text primary key references ambs_erp.members(email) on delete cascade,
  drafts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
revoke all on ambs_erp.drafts from public, anon, authenticated;
grant select, insert, update on ambs_erp.drafts to service_role;
alter table ambs_erp.drafts enable row level security;

create or replace function public.ambs_erp_drafts_read(p_email text)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce((select d.drafts from ambs_erp.drafts d where d.email = lower(p_email)), '{}'::jsonb)
   where exists (select 1 from ambs_erp.members m where m.email = lower(p_email) and m.enabled);
$$;

create or replace function public.ambs_erp_drafts_write(p_email text, p_drafts jsonb)
returns boolean language plpgsql security invoker set search_path = ''
as $$
begin
  if not exists (select 1 from ambs_erp.members m where m.email = lower(p_email) and m.enabled) then
    return false;
  end if;
  insert into ambs_erp.drafts(email, drafts, updated_at) values (lower(p_email), p_drafts, now())
  on conflict (email) do update set drafts = excluded.drafts, updated_at = now();
  return true;
end;
$$;

revoke all on function public.ambs_erp_drafts_read(text), public.ambs_erp_drafts_write(text, jsonb) from public, anon, authenticated;
grant execute on function public.ambs_erp_drafts_read(text), public.ambs_erp_drafts_write(text, jsonb) to service_role;

-- TENANT FOUNDATION v2 — REVIEW DRAFT ONLY
-- Target: the existing Lavage Tracker Supabase schema.
-- Do not apply to the inactive project or production until schema review,
-- disposable-database tests, backup and owner UUID verification are complete.
-- This file intentionally does not create a Supabase project or apply itself.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists business_memberships_user_business_idx
  on public.business_memberships(user_id, business_id);

insert into public.businesses(name, slug)
values ('Lavage International', 'lavage-international')
on conflict (slug) do nothing;

alter table public.jobs
  add column if not exists business_id uuid
  references public.businesses(id) on delete restrict;

update public.jobs j
set business_id = b.id
from public.businesses b
where b.slug = 'lavage-international'
  and j.business_id is null;

do $$
begin
  if exists (select 1 from public.jobs where business_id is null) then
    raise exception 'Tenant migration stopped: one or more jobs could not be assigned to Lavage International';
  end if;
end;
$$;

alter table public.jobs alter column business_id set not null;
alter table public.jobs drop constraint if exists jobs_tracking_code_key;
create unique index if not exists jobs_business_tracking_code_uidx
  on public.jobs(business_id, upper(tracking_code));
create index if not exists jobs_business_created_at_idx
  on public.jobs(business_id, created_at desc);

create or replace function private.is_business_member(p_business_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_memberships m
    where m.business_id = p_business_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_business_role(p_business_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_memberships m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.role = any(p_roles)
  );
$$;

create or replace function private.current_single_business_id()
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_ids uuid[];
begin
  select array_agg(m.business_id order by m.created_at, m.business_id)
  into v_ids
  from public.business_memberships m
  where m.user_id = (select auth.uid());

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'No business membership is assigned to this account';
  end if;
  if cardinality(v_ids) <> 1 then
    raise exception 'Select a business workspace before creating a job';
  end if;
  return v_ids[1];
end;
$$;

create or replace function private.create_business_with_owner(p_name text, p_slug text)
returns table(business_id uuid, business_name text, business_slug text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_business_id uuid;
  v_name text := btrim(p_name);
  v_slug text := lower(btrim(p_slug));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if length(v_name) not between 2 and 100 then
    raise exception 'Business name must be between 2 and 100 characters';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 60 then
    raise exception 'Business URL must use lowercase letters, numbers and single hyphens';
  end if;

  insert into public.businesses(name, slug)
  values (v_name, v_slug)
  returning id into v_business_id;

  insert into public.business_memberships(business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  return query select v_business_id, v_name, v_slug;
exception
  when unique_violation then
    raise exception 'That business URL is already in use. Choose another one.';
end;
$$;

create or replace function public.create_business_with_owner(p_name text, p_slug text)
returns table(business_id uuid, business_name text, business_slug text)
language sql security invoker set search_path = ''
as $$
  select * from private.create_business_with_owner(p_name, p_slug);
$$;

create or replace function private.create_staff_job(
  p_business_id uuid,
  p_customer_name text, p_phone text, p_vehicle text, p_plate text,
  p_service text, p_status public.job_status, p_notes text default null
)
returns setof public.jobs
language plpgsql security definer set search_path = ''
as $$
declare
  v_next_number bigint;
  v_tracking_code text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if not private.has_business_role(p_business_id, array['owner','manager','staff']::text[]) then
    raise exception 'You do not have staff access to this business';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':tracking-code', 0));
  select coalesce(
    max(nullif(regexp_replace(j.tracking_code, '\D', '', 'g'), '')::bigint), 999
  ) + 1
  into v_next_number
  from public.jobs j
  where j.business_id = p_business_id and j.tracking_code ~ '^LAV-[0-9]+$';

  v_tracking_code := 'LAV-' || v_next_number::text;

  return query
  insert into public.jobs(
    business_id, tracking_code, customer_name, phone, vehicle, plate,
    service, status, notes
  )
  values (
    p_business_id, v_tracking_code, btrim(p_customer_name), btrim(p_phone),
    btrim(p_vehicle), upper(btrim(p_plate)), btrim(p_service), p_status,
    coalesce(nullif(btrim(p_notes), ''), '')
  )
  returning *;
end;
$$;

create or replace function public.create_staff_job(
  p_business_id uuid,
  p_customer_name text, p_phone text, p_vehicle text, p_plate text,
  p_service text, p_status public.job_status, p_notes text default null
)
returns setof public.jobs
language sql security invoker set search_path = ''
as $$
  select * from private.create_staff_job(
    p_business_id, p_customer_name, p_phone, p_vehicle, p_plate,
    p_service, p_status, p_notes
  );
$$;

-- Backwards-compatible signature for the original single-business staff app.
create or replace function public.create_staff_job(
  p_customer_name text, p_phone text, p_vehicle text, p_plate text,
  p_service text, p_status public.job_status, p_notes text default null
)
returns setof public.jobs
language sql security invoker set search_path = ''
as $$
  select * from private.create_staff_job(
    private.current_single_business_id(), p_customer_name, p_phone,
    p_vehicle, p_plate, p_service, p_status, p_notes
  );
$$;

create or replace function private.public_job_lookup(p_code text)
returns table(
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security definer set search_path = ''
as $$
  select j.tracking_code, j.vehicle, j.plate, j.service, j.status::text,
         j.created_at, j.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.changed_at)
                            order by h.changed_at)
           from public.job_status_history h where h.job_id = j.id
         ), '[]'::jsonb)
  from public.jobs j
  where upper(j.tracking_code) = upper(btrim(p_code))
    and (select count(*) from public.jobs x
         where upper(x.tracking_code) = upper(btrim(p_code))) = 1
  limit 1;
$$;

create or replace function private.public_job_lookup(p_business_slug text, p_code text)
returns table(
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security definer set search_path = ''
as $$
  select j.tracking_code, j.vehicle, j.plate, j.service, j.status::text,
         j.created_at, j.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.changed_at)
                            order by h.changed_at)
           from public.job_status_history h where h.job_id = j.id
         ), '[]'::jsonb)
  from public.jobs j
  join public.businesses b on b.id = j.business_id
  where b.slug = lower(btrim(p_business_slug))
    and upper(j.tracking_code) = upper(btrim(p_code))
  limit 1;
$$;

create or replace function public.public_job_lookup(p_code text)
returns table(
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security invoker set search_path = ''
as $$ select * from private.public_job_lookup(p_code); $$;

create or replace function public.public_job_lookup(p_business_slug text, p_code text)
returns table(
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security invoker set search_path = ''
as $$ select * from private.public_job_lookup(p_business_slug, p_code); $$;

-- Protect the last owner against accidental removal or demotion.
create or replace function private.prevent_last_business_owner_removal()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.business_id <> old.business_id) then
    if not exists (
      select 1 from public.business_memberships m
      where m.business_id = old.business_id
        and m.role = 'owner'
        and m.id <> old.id
    ) then
      raise exception 'A business must always retain at least one owner';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists business_memberships_keep_owner on public.business_memberships;
create trigger business_memberships_keep_owner
before update or delete on public.business_memberships
for each row execute function private.prevent_last_business_owner_removal();

-- Remove all old permissive policies before installing tenant-scoped policies.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('businesses','business_memberships','jobs','job_status_history')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end;
$$;

alter table public.businesses enable row level security;
alter table public.business_memberships enable row level security;
alter table public.jobs enable row level security;
alter table public.job_status_history enable row level security;

revoke all on public.businesses from anon, authenticated;
revoke all on public.business_memberships from anon, authenticated;
revoke all on public.jobs from anon, authenticated;
revoke all on public.job_status_history from anon, authenticated;

grant select, update(name, slug) on public.businesses to authenticated;
grant select, insert, update, delete on public.business_memberships to authenticated;
grant select on public.jobs to authenticated;
grant update(status, notes) on public.jobs to authenticated;
grant select on public.job_status_history to authenticated;

create policy businesses_member_read on public.businesses
for select to authenticated using ((select private.is_business_member(id)));

create policy businesses_owner_manager_update on public.businesses
for update to authenticated
using ((select private.has_business_role(id, array['owner','manager']::text[])))
with check ((select private.has_business_role(id, array['owner','manager']::text[])));

create policy memberships_member_read on public.business_memberships
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_business_role(business_id, array['owner','manager']::text[]))
);

create policy memberships_owner_insert on public.business_memberships
for insert to authenticated
with check ((select private.has_business_role(business_id, array['owner']::text[])));

create policy memberships_owner_update on public.business_memberships
for update to authenticated
using (user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[])))
with check (user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[])));

create policy memberships_owner_delete on public.business_memberships
for delete to authenticated
using (user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[])));

create policy jobs_business_member_read on public.jobs
for select to authenticated
using ((select private.is_business_member(business_id)));

create policy jobs_business_staff_update on public.jobs
for update to authenticated
using ((select private.has_business_role(business_id, array['owner','manager','staff']::text[])))
with check ((select private.has_business_role(business_id, array['owner','manager','staff']::text[])));

create policy job_history_business_member_read on public.job_status_history
for select to authenticated
using (exists (
  select 1 from public.jobs j
  where j.id = job_id and (select private.is_business_member(j.business_id))
));

-- Status history is written only by this trigger, never directly by API clients.
create or replace function private.jobs_log_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.job_status_history(job_id, status) values (new.id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_log_status_ins on public.jobs;
drop trigger if exists jobs_log_status_upd on public.jobs;
revoke all on function public.jobs_log_status() from public, anon, authenticated;
drop function if exists public.jobs_log_status();
revoke all on function private.jobs_log_status() from public, anon, authenticated;
create trigger jobs_log_status_ins after insert on public.jobs
for each row execute function private.jobs_log_status();
create trigger jobs_log_status_upd after update on public.jobs
for each row execute function private.jobs_log_status();

-- Explicit function grants: no anonymous access to staff/business operations.
revoke all on function private.is_business_member(uuid) from public, anon;
revoke all on function private.has_business_role(uuid, text[]) from public, anon;
revoke all on function private.current_single_business_id() from public, anon;
revoke all on function private.create_business_with_owner(text, text) from public, anon;
revoke all on function private.create_staff_job(uuid, text, text, text, text, text, public.job_status, text) from public, anon;
revoke all on function private.public_job_lookup(text) from public;
revoke all on function private.public_job_lookup(text, text) from public;
revoke all on function private.prevent_last_business_owner_removal() from public, anon, authenticated;
revoke all on function private.jobs_log_status() from public, anon, authenticated;

grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid, text[]) to authenticated;
grant execute on function private.current_single_business_id() to authenticated;
grant execute on function private.create_business_with_owner(text, text) to authenticated;
grant execute on function private.create_staff_job(uuid, text, text, text, text, text, public.job_status, text) to authenticated;
grant execute on function private.public_job_lookup(text) to anon, authenticated;
grant execute on function private.public_job_lookup(text, text) to anon, authenticated;

revoke all on function public.create_business_with_owner(text, text) from public, anon;
revoke all on function public.create_staff_job(uuid, text, text, text, text, text, public.job_status, text) from public, anon;
revoke all on function public.create_staff_job(text, text, text, text, text, public.job_status, text) from public, anon;
revoke all on function public.public_job_lookup(text) from public;
revoke all on function public.public_job_lookup(text, text) from public;
grant execute on function public.create_business_with_owner(text, text) to authenticated;
grant execute on function public.create_staff_job(uuid, text, text, text, text, text, public.job_status, text) to authenticated;
grant execute on function public.create_staff_job(text, text, text, text, text, public.job_status, text) to authenticated;
grant execute on function public.public_job_lookup(text) to anon, authenticated;
grant execute on function public.public_job_lookup(text, text) to anon, authenticated;

commit;

-- MANUAL BOOTSTRAP, ONLY AFTER AUTH USER UUID IS VERIFIED:
-- insert into public.business_memberships(business_id, user_id, role)
-- select b.id, '<VERIFIED_AUTH_USER_UUID>'::uuid, 'owner'
-- from public.businesses b where b.slug = 'lavage-international';

begin;

-- PROPOSAL ONLY. Do not apply until the target project is active, backed up,
-- and the intended Lavage International owner UUID has been verified.
-- This adds tenant scoping while preserving existing job/customer data.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
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
  on public.business_memberships (user_id, business_id);

insert into public.businesses (name, slug)
values ('Lavage International', 'lavage-international')
on conflict (slug) do nothing;

alter table public.jobs
  add column if not exists business_id uuid
  references public.businesses(id) on delete restrict;

update public.jobs
set business_id = (
  select b.id from public.businesses b
  where b.slug = 'lavage-international'
)
where business_id is null;

alter table public.jobs alter column business_id set not null;

-- Replace global tracking-code uniqueness with tenant-scoped uniqueness.
alter table public.jobs drop constraint if exists jobs_tracking_code_key;
create unique index if not exists jobs_business_tracking_code_uidx
  on public.jobs (business_id, upper(tracking_code));
create index if not exists jobs_business_created_at_idx
  on public.jobs (business_id, created_at desc);

-- Private helper schema is not to be added to Supabase exposed API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon;

create or replace function private.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_memberships m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_business_role(p_business_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.business_memberships m
    where m.business_id = p_business_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function private.current_single_business_id()
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare
  v_business_ids uuid[];
begin
  select array_agg(m.business_id order by m.created_at, m.business_id)
  into v_business_ids
  from public.business_memberships m
  where m.user_id = (select auth.uid())
    and m.role in ('owner', 'manager', 'staff');

  if coalesce(cardinality(v_business_ids), 0) = 0 then
    raise exception 'No active business membership is assigned to this account';
  end if;
  if cardinality(v_business_ids) <> 1 then
    raise exception 'Select a business workspace before creating a job';
  end if;
  return v_business_ids[1];
end;
$$;

revoke all on function private.is_business_member(uuid) from public, anon;
revoke all on function private.has_business_role(uuid, text[]) from public, anon;
revoke all on function private.current_single_business_id() from public, anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid, text[]) to authenticated;
grant execute on function private.current_single_business_id() to authenticated;

-- Customer-safe lookup implementation; never returns names, phone numbers,
-- staff notes, membership data, or any other private customer/staff fields.
create or replace function private.public_job_lookup(p_business_slug text, p_code text)
returns table (
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security definer set search_path = ''
as $$
  select j.tracking_code, j.vehicle, j.plate, j.service, j.status::text,
         j.created_at, j.updated_at,
         coalesce((
           select jsonb_agg(
             jsonb_build_object('status', h.status, 'at', h.changed_at)
             order by h.changed_at
           )
           from public.job_status_history h where h.job_id = j.id
         ), '[]'::jsonb)
  from public.jobs j
  join public.businesses b on b.id = j.business_id
  where p_business_slug is not null
    and b.slug = lower(btrim(p_business_slug))
    and upper(j.tracking_code) = upper(btrim(p_code))
  limit 1;
$$;

create or replace function private.public_job_lookup_global(p_code text)
returns table (
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable security definer set search_path = ''
as $$
  select j.tracking_code, j.vehicle, j.plate, j.service, j.status::text,
         j.created_at, j.updated_at,
         coalesce((
           select jsonb_agg(
             jsonb_build_object('status', h.status, 'at', h.changed_at)
             order by h.changed_at
           )
           from public.job_status_history h where h.job_id = j.id
         ), '[]'::jsonb)
  from public.jobs j
  where upper(j.tracking_code) = upper(btrim(p_code))
    and (
      select count(*) from public.jobs matches
      where upper(matches.tracking_code) = upper(btrim(p_code))
    ) = 1
  limit 1;
$$;

revoke all on function private.public_job_lookup(text, text) from public;
revoke all on function private.public_job_lookup_global(text) from public;
grant execute on function private.public_job_lookup(text, text) to anon, authenticated;
grant execute on function private.public_job_lookup_global(text) to anon, authenticated;

-- Preserve the old one-argument customer RPC; it fails closed if ambiguous.
create or replace function public.public_job_lookup(p_code text)
returns table (
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable set search_path = ''
as $$ select * from private.public_job_lookup_global(p_code); $$;

-- New tenant-aware customer RPC for branded business tracking URLs.
create or replace function public.public_job_lookup(p_business_slug text, p_code text)
returns table (
  tracking_code text, vehicle text, plate text, service text, status text,
  created_at timestamptz, updated_at timestamptz, history jsonb
)
language sql stable set search_path = ''
as $$ select * from private.public_job_lookup(p_business_slug, p_code); $$;

revoke all on function public.public_job_lookup(text) from public;
revoke all on function public.public_job_lookup(text, text) from public;
grant execute on function public.public_job_lookup(text) to anon, authenticated;
grant execute on function public.public_job_lookup(text, text) to anon, authenticated;

-- Keep the existing RPC argument list so the current staff UI can be migrated
-- without changing the function call shape. It requires one business context.
create or replace function private.create_staff_job(
  p_customer_name text, p_phone text, p_vehicle text, p_plate text,
  p_service text, p_status public.job_status, p_notes text default null
)
returns setof public.jobs
language plpgsql security definer set search_path = ''
as $$
declare
  v_business_id uuid;
  v_next_number bigint;
  v_tracking_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_business_id := private.current_single_business_id();
  if not private.has_business_role(
    v_business_id, array['owner', 'manager', 'staff']::text[]
  ) then
    raise exception 'Authorized business staff access required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_business_id::text || ':tracking-code', 0)
  );

  select coalesce(
    max(nullif(regexp_replace(j.tracking_code, '\D', '', 'g'), '')::bigint),
    999
  ) + 1
  into v_next_number
  from public.jobs j
  where j.business_id = v_business_id
    and j.tracking_code ~ '^LAV-[0-9]+$';

  v_tracking_code := 'LAV-' || v_next_number::text;

  return query
  insert into public.jobs (
    business_id, tracking_code, customer_name, phone, vehicle, plate,
    service, status, notes
  )
  values (
    v_business_id, v_tracking_code, trim(p_customer_name), trim(p_phone),
    trim(p_vehicle), upper(trim(p_plate)), trim(p_service), p_status,
    coalesce(nullif(trim(p_notes), ''), '')
  )
  returning *;
end;
$$;

revoke all on function private.create_staff_job(
  text, text, text, text, text, public.job_status, text
) from public, anon;
grant execute on function private.create_staff_job(
  text, text, text, text, text, public.job_status, text
) to authenticated;

-- SECURITY INVOKER wrapper. Authorization occurs inside the private function.
create or replace function public.create_staff_job(
  p_customer_name text, p_phone text, p_vehicle text, p_plate text,
  p_service text, p_status public.job_status, p_notes text default null
)
returns setof public.jobs
language sql set search_path = ''
as $$
  select * from private.create_staff_job(
    p_customer_name, p_phone, p_vehicle, p_plate, p_service, p_status, p_notes
  );
$$;

revoke all on function public.create_staff_job(
  text, text, text, text, text, public.job_status, text
) from public, anon;
grant execute on function public.create_staff_job(
  text, text, text, text, text, public.job_status, text
) to authenticated;

-- Drop every old policy on these tenant tables. Policies are OR-combined;
-- leaving one legacy USING(true) policy would defeat tenant isolation.
do $$
declare v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('businesses', 'business_memberships', 'jobs', 'job_status_history')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname, v_policy.schemaname, v_policy.tablename
    );
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

grant select on public.businesses to authenticated;
grant update (name, slug) on public.businesses to authenticated;
grant select, insert, update, delete on public.business_memberships to authenticated;
grant select on public.jobs to authenticated;
grant update (status, notes) on public.jobs to authenticated;
grant select on public.job_status_history to authenticated;

create policy businesses_member_read
on public.businesses for select to authenticated
using ((select private.is_business_member(id)));

create policy businesses_owner_manager_update
on public.businesses for update to authenticated
using ((select private.has_business_role(id, array['owner', 'manager']::text[])))
with check ((select private.has_business_role(id, array['owner', 'manager']::text[])));

create policy memberships_member_read
on public.business_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_business_role(business_id, array['owner', 'manager']::text[]))
);

create policy memberships_owner_insert
on public.business_memberships for insert to authenticated
with check ((select private.has_business_role(business_id, array['owner']::text[])));

create policy memberships_owner_update
on public.business_memberships for update to authenticated
using (
  user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[]))
)
with check (
  user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[]))
);

create policy memberships_owner_delete
on public.business_memberships for delete to authenticated
using (
  user_id <> (select auth.uid())
  and (select private.has_business_role(business_id, array['owner']::text[]))
);

create policy jobs_business_member_read
on public.jobs for select to authenticated
using ((select private.is_business_member(business_id)));

create policy jobs_business_staff_insert
on public.jobs for insert to authenticated
with check ((
  select private.has_business_role(
    business_id, array['owner', 'manager', 'staff']::text[]
  )
));

create policy jobs_business_staff_update
on public.jobs for update to authenticated
using ((
  select private.has_business_role(
    business_id, array['owner', 'manager', 'staff']::text[]
  )
))
with check ((
  select private.has_business_role(
    business_id, array['owner', 'manager', 'staff']::text[]
  )
));

-- History is read-only to API clients; the trusted status trigger writes it.
create policy job_history_business_member_read
on public.job_status_history for select to authenticated
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_id
      and (select private.is_business_member(j.business_id))
  )
);

-- Trigger function is privileged only for automatic status-history inserts.
create or replace function private.jobs_log_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.job_status_history (job_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

revoke all on function private.jobs_log_status() from public, anon, authenticated;
-- Remove both triggers before dropping their legacy exposed-schema function.
drop trigger if exists jobs_log_status_ins on public.jobs;
drop trigger if exists jobs_log_status_upd on public.jobs;
revoke all on function public.jobs_log_status() from public, anon, authenticated;
drop function if exists public.jobs_log_status();

create trigger jobs_log_status_ins after insert on public.jobs
for each row execute function private.jobs_log_status();
create trigger jobs_log_status_upd after update on public.jobs
for each row execute function private.jobs_log_status();

commit;

-- MANUAL VERIFICATION — run only after an explicitly approved application:
-- select id, name, slug from public.businesses where slug = 'lavage-international';
-- select count(*) as jobs_without_business from public.jobs where business_id is null;
-- select tablename, policyname, qual, with_check from pg_policies
-- where schemaname = 'public'
-- and tablename in ('jobs', 'job_status_history') order by tablename, policyname;
-- select * from public.public_job_lookup('lavage-international', 'LAV-1001');
--
-- OWNER BOOTSTRAP — only after inspecting Auth and verifying the exact owner UUID:
-- insert into public.business_memberships (business_id, user_id, role)
-- select b.id, '<VERIFIED_AUTH_USER_UUID>'::uuid, 'owner'
-- from public.businesses b where b.slug = 'lavage-international';

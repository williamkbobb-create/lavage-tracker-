-- ============================================================
-- LAVAGE INTERNATIONAL
-- Production Job Creation / Tracking Code Fix
-- ============================================================

-- ------------------------------------------------------------
-- 1. Secure staff-only job creation function
-- ------------------------------------------------------------

create or replace function public.create_staff_job(
  p_customer_name text,
  p_phone text,
  p_vehicle text,
  p_plate text,
  p_service text,
  p_status public.job_status,
  p_notes text default null
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_number integer;
  v_tracking_code text;
  v_job public.jobs;
begin
  -- Only authenticated staff/users can call this function.
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  /*
    Serialize tracking-code generation.

    This means two staff members cannot simultaneously calculate
    the same next LAV number.
  */
  perform pg_advisory_xact_lock(
    hashtextextended('lavage-international-tracking-code', 0)
  );

  -- Find the highest existing numeric tracking code.
  select coalesce(
    max(
      nullif(
        regexp_replace(tracking_code, '\D', '', 'g'),
        ''
      )::integer
    ),
    999
  )
  into v_next_number
  from public.jobs
  where tracking_code ~ '^LAV-[0-9]+$';

  v_next_number := v_next_number + 1;

  v_tracking_code := 'LAV-' || v_next_number;

  insert into public.jobs (
    tracking_code,
    customer_name,
    phone,
    vehicle,
    plate,
    service,
    status,
    notes
  )
  values (
    v_tracking_code,
    trim(p_customer_name),
    trim(p_phone),
    trim(p_vehicle),
    upper(trim(p_plate)),
    trim(p_service),
    p_status,
    nullif(trim(p_notes), '')
  )
  returning *
  into v_job;

  return next v_job;
end;
$$;


-- ------------------------------------------------------------
-- 2. Restrict execution
-- ------------------------------------------------------------

revoke all
on function public.create_staff_job(
  text,
  text,
  text,
  text,
  public.job_status,
  text
)
from public;

grant execute
on function public.create_staff_job(
  text,
  text,
  text,
  text,
  public.job_status,
  text
)
to authenticated;


-- ------------------------------------------------------------
-- 3. Make sure public customer lookup remains safe
-- ------------------------------------------------------------

create or replace function public.public_job_lookup(
  p_code text
)
returns table (
  tracking_code text,
  vehicle text,
  plate text,
  service text,
  status public.job_status,
  created_at timestamptz,
  updated_at timestamptz,
  history jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    j.tracking_code,
    j.vehicle,
    j.plate,
    j.service,
    j.status,
    j.created_at,
    j.updated_at,

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'status', h.status,
            'at', h.changed_at
          )
          order by h.changed_at asc
        )
        from public.job_status_history h
        where h.job_id = j.id
      ),
      '[]'::jsonb
    ) as history

  from public.jobs j
  where upper(trim(j.tracking_code)) =
        upper(trim(p_code))
  limit 1;
$$;


-- ------------------------------------------------------------
-- 4. Public lookup permissions
-- ------------------------------------------------------------

revoke all
on function public.public_job_lookup(text)
from public;

grant execute
on function public.public_job_lookup(text)
to anon;

grant execute
on function public.public_job_lookup(text)
to authenticated;


-- ------------------------------------------------------------
-- 5. Ensure RLS remains enabled
-- ------------------------------------------------------------

alter table public.jobs enable row level security;

alter table public.job_status_history enable row level security;


-- ------------------------------------------------------------
-- 6. Staff can read jobs
-- ------------------------------------------------------------

drop policy if exists "Authenticated staff can view jobs"
on public.jobs;

create policy "Authenticated staff can view jobs"
on public.jobs
for select
to authenticated
using (true);


-- ------------------------------------------------------------
-- 7. Staff can update jobs
-- ------------------------------------------------------------

drop policy if exists "Authenticated staff can update jobs"
on public.jobs;

create policy "Authenticated staff can update jobs"
on public.jobs
for update
to authenticated
using (true)
with check (true);


-- ------------------------------------------------------------
-- 8. Staff can read status history
-- ------------------------------------------------------------

drop policy if exists "Authenticated staff can view status history"
on public.job_status_history;

create policy "Authenticated staff can view status history"
on public.job_status_history
for select
to authenticated
using (true);


-- ------------------------------------------------------------
-- 9. Staff can insert status history
-- ------------------------------------------------------------

drop policy if exists "Authenticated staff can insert status history"
on public.job_status_history;

create policy "Authenticated staff can insert status history"
on public.job_status_history
for insert
to authenticated
with check (true);


-- ------------------------------------------------------------
-- 10. Ensure anonymous users do NOT directly access jobs
-- ------------------------------------------------------------

revoke all
on table public.jobs
from anon;

revoke all
on table public.job_status_history
from anon;

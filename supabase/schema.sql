-- =====================================================================
-- Lavage International Car Progress Tracker — Supabase schema
-- Paste this whole file into: Supabase Dashboard > SQL Editor > New query
-- Safe to run once on a fresh project.
-- =====================================================================

-- 1. Status enum (the seven stages)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type public.job_status as enum (
      'Car Received',
      'Inspection',
      'Washing',
      'Detailing',
      'Quality Check',
      'Ready for Pickup',
      'Completed'
    );
  end if;
end $$;

-- 2. Jobs table
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  customer_name text not null,
  phone text not null default '',
  vehicle text not null,
  plate text not null,
  service text not null,
  status public.job_status not null default 'Car Received',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Status history (drives the customer timeline)
create table if not exists public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  status public.job_status not null,
  changed_at timestamptz not null default now()
);
create index if not exists job_status_history_job_id_idx on public.job_status_history(job_id);

-- 4. Grants (PostgREST needs these; RLS still applies)
grant select, insert, update on public.jobs to authenticated;
grant select, insert on public.job_status_history to authenticated;
-- anon gets NO table privileges at all; public lookup goes through the RPC below.

-- 5. Row Level Security
alter table public.jobs enable row level security;
alter table public.job_status_history enable row level security;

drop policy if exists "staff read jobs" on public.jobs;
create policy "staff read jobs" on public.jobs
  for select to authenticated using (true);

drop policy if exists "staff create jobs" on public.jobs;
create policy "staff create jobs" on public.jobs
  for insert to authenticated with check (true);

drop policy if exists "staff update jobs" on public.jobs;
create policy "staff update jobs" on public.jobs
  for update to authenticated using (true) with check (true);

-- No delete policy: nobody can delete jobs through the API.

drop policy if exists "staff read history" on public.job_status_history;
create policy "staff read history" on public.job_status_history
  for select to authenticated using (true);

drop policy if exists "staff insert history" on public.job_status_history;
create policy "staff insert history" on public.job_status_history
  for insert to authenticated with check (true);

-- 6. Keep updated_at fresh + record history automatically on status change
create or replace function public.jobs_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists jobs_touch_updated_at on public.jobs;
create trigger jobs_touch_updated_at before update on public.jobs
  for each row execute function public.jobs_touch_updated_at();

create or replace function public.jobs_log_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.job_status_history(job_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;

drop trigger if exists jobs_log_status_ins on public.jobs;
create trigger jobs_log_status_ins after insert on public.jobs
  for each row execute function public.jobs_log_status();

drop trigger if exists jobs_log_status_upd on public.jobs;
create trigger jobs_log_status_upd after update on public.jobs
  for each row execute function public.jobs_log_status();

-- 7. Public lookup by EXACT tracking code.
--    Returns only customer-safe fields: no phone number, no staff notes.
create or replace function public.public_job_lookup(p_code text)
returns table (
  tracking_code text,
  vehicle text,
  plate text,
  service text,
  status text,
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
    j.status::text,
    j.created_at,
    j.updated_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object('status', h.status, 'at', h.changed_at) order by h.changed_at)
         from public.job_status_history h where h.job_id = j.id),
      '[]'::jsonb
    ) as history
  from public.jobs j
  where upper(j.tracking_code) = upper(btrim(p_code))
  limit 1;
$$;

revoke all on function public.public_job_lookup(text) from public;
grant execute on function public.public_job_lookup(text) to anon, authenticated;

-- 8. Sample jobs for testing
insert into public.jobs (tracking_code, customer_name, phone, vehicle, plate, service, status, notes)
values
  ('LAV-1001', 'Amina Diallo', '+225 07 12 34 56', 'Toyota Land Cruiser', 'AB-4471-CI', 'Full Detailing', 'Washing', 'Customer requested extra attention on the wheel arches.'),
  ('LAV-1002', 'Kwame Mensah', '+225 05 88 22 10', 'Mercedes-Benz C300', 'ZY-9920-CI', 'Ceramic Coating', 'Quality Check', 'Minor scratch on rear bumper noted at intake.'),
  ('LAV-1003', 'Sarah Kouassi', '+225 01 44 55 66', 'Hyundai Tucson', 'KL-3388-CI', 'Exterior Wash', 'Ready for Pickup', 'Paid at reception.')
on conflict (tracking_code) do nothing;

-- Backfill a realistic timeline for the sample jobs
insert into public.job_status_history (job_id, status, changed_at)
select j.id, s.status::public.job_status, now() - s.ago
from public.jobs j
join (values
  ('LAV-1001','Car Received', interval '180 minutes'),
  ('LAV-1001','Inspection',   interval '140 minutes'),
  ('LAV-1002','Car Received', interval '400 minutes'),
  ('LAV-1002','Inspection',   interval '370 minutes'),
  ('LAV-1002','Washing',      interval '300 minutes'),
  ('LAV-1002','Detailing',    interval '180 minutes'),
  ('LAV-1003','Car Received', interval '240 minutes'),
  ('LAV-1003','Inspection',   interval '225 minutes'),
  ('LAV-1003','Washing',      interval '190 minutes'),
  ('LAV-1003','Detailing',    interval '150 minutes'),
  ('LAV-1003','Quality Check',interval '120 minutes')
) as s(code, status, ago) on s.code = j.tracking_code
where not exists (
  select 1 from public.job_status_history h
  where h.job_id = j.id and h.status = s.status::public.job_status
);

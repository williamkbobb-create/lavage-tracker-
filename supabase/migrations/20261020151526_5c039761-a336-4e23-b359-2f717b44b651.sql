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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('lavage-international-tracking-code', 0)
  );

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
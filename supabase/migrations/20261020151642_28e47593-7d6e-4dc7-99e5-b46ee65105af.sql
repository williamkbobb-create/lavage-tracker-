create or replace function public.jobs_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;

revoke all on public.jobs from anon;
revoke all on public.job_status_history from anon;
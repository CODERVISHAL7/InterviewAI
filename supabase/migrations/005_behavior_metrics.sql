create table if not exists public.behavior_metrics (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  camera_permission text not null default 'unknown' check (camera_permission in ('unknown','granted','denied','unsupported','error')),
  face_presence_seconds integer not null default 0 check (face_presence_seconds >= 0),
  multiple_faces_events integer not null default 0 check (multiple_faces_events >= 0),
  out_of_frame_events integer not null default 0 check (out_of_frame_events >= 0),
  out_of_frame_seconds integer not null default 0 check (out_of_frame_seconds >= 0),
  head_away_events integer not null default 0 check (head_away_events >= 0),
  posture_deviation_events integer not null default 0 check (posture_deviation_events >= 0),
  monitoring_started_at timestamptz,
  monitoring_ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists behavior_metrics_user_id_idx on public.behavior_metrics(user_id);
create index if not exists behavior_metrics_interview_id_idx on public.behavior_metrics(interview_id);

alter table public.behavior_metrics enable row level security;

drop policy if exists "Users can view their own behavior metrics" on public.behavior_metrics;
create policy "Users can view their own behavior metrics"
on public.behavior_metrics for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert their own behavior metrics" on public.behavior_metrics;
create policy "Users can insert their own behavior metrics"
on public.behavior_metrics for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.interviews i
    where i.id = behavior_metrics.interview_id and i.user_id = auth.uid()
  )
);

drop policy if exists "Users can update their own behavior metrics" on public.behavior_metrics;
create policy "Users can update their own behavior metrics"
on public.behavior_metrics for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete their own behavior metrics" on public.behavior_metrics;
create policy "Users can delete their own behavior metrics"
on public.behavior_metrics for delete to authenticated
using (user_id = auth.uid());

create or replace function public.set_behavior_metrics_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists behavior_metrics_updated_at on public.behavior_metrics;
create trigger behavior_metrics_updated_at
before update on public.behavior_metrics
for each row execute function public.set_behavior_metrics_updated_at();

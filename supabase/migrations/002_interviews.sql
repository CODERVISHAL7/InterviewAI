-- Phase 3: interview configuration and interview records
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_role text not null,
  company text,
  interview_type text not null check (interview_type in ('Technical', 'HR', 'Mixed')),
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  skills text,
  total_questions integer not null check (total_questions between 1 and 50),
  status text not null default 'setup' check (status in ('setup', 'in_progress', 'completed', 'abandoned')),
  total_score numeric(5,2),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interviews_user_id_idx on public.interviews(user_id);
create index if not exists interviews_created_at_idx on public.interviews(created_at desc);

alter table public.interviews enable row level security;

drop policy if exists "Users can view own interviews" on public.interviews;
drop policy if exists "Users can create own interviews" on public.interviews;
drop policy if exists "Users can update own interviews" on public.interviews;
drop policy if exists "Users can delete own interviews" on public.interviews;

create policy "Users can view own interviews"
on public.interviews for select
using (auth.uid() = user_id);

create policy "Users can create own interviews"
on public.interviews for insert
with check (auth.uid() = user_id);

create policy "Users can update own interviews"
on public.interviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own interviews"
on public.interviews for delete
using (auth.uid() = user_id);

create or replace function public.set_interviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists interviews_set_updated_at on public.interviews;
create trigger interviews_set_updated_at
before update on public.interviews
for each row execute function public.set_interviews_updated_at();

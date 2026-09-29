create table if not exists public.learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_areas jsonb not null default '[]'::jsonb,
  recommended_topics jsonb not null default '[]'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  hr_practice_tips jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists learning_recommendations_user_id_idx on public.learning_recommendations(user_id);
alter table public.learning_recommendations enable row level security;
drop policy if exists "Users can view own learning recommendations" on public.learning_recommendations;
create policy "Users can view own learning recommendations" on public.learning_recommendations for select to authenticated using (auth.uid() = user_id);
create or replace function public.set_learning_recommendations_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists learning_recommendations_set_updated_at on public.learning_recommendations;
create trigger learning_recommendations_set_updated_at before update on public.learning_recommendations for each row execute function public.set_learning_recommendations_updated_at();

create table if not exists public.performance_reports (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references public.interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answered_questions integer not null default 0 check (answered_questions >= 0),
  evaluated_questions integer not null default 0 check (evaluated_questions >= 0),
  overall_score numeric(5,2) not null default 0 check (overall_score >= 0 and overall_score <= 100),
  correctness numeric(5,2) not null default 0 check (correctness >= 0 and correctness <= 100),
  relevance numeric(5,2) not null default 0 check (relevance >= 0 and relevance <= 100),
  technical_knowledge numeric(5,2) not null default 0 check (technical_knowledge >= 0 and technical_knowledge <= 100),
  completeness numeric(5,2) not null default 0 check (completeness >= 0 and completeness <= 100),
  clarity numeric(5,2) not null default 0 check (clarity >= 0 and clarity <= 100),
  communication numeric(5,2) not null default 0 check (communication >= 0 and communication <= 100),
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  proctoring_summary jsonb not null default '{}'::jsonb,
  provider text not null default 'system',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists performance_reports_user_id_idx on public.performance_reports(user_id);
alter table public.performance_reports enable row level security;
create policy "Users can view own performance reports" on public.performance_reports for select to authenticated using (auth.uid() = user_id);
create or replace function public.set_performance_reports_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists performance_reports_set_updated_at on public.performance_reports;
create trigger performance_reports_set_updated_at before update on public.performance_reports for each row execute function public.set_performance_reports_updated_at();

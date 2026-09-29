create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null unique references public.answers(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  correctness numeric(5,2) not null check (correctness >= 0 and correctness <= 100),
  relevance numeric(5,2) not null check (relevance >= 0 and relevance <= 100),
  technical_knowledge numeric(5,2) not null check (technical_knowledge >= 0 and technical_knowledge <= 100),
  completeness numeric(5,2) not null check (completeness >= 0 and completeness <= 100),
  clarity numeric(5,2) not null check (clarity >= 0 and clarity <= 100),
  communication numeric(5,2) not null check (communication >= 0 and communication <= 100),
  feedback text not null default '',
  suggested_answer text not null default '',
  provider text not null default 'unknown',
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluations_user_id_idx on public.evaluations(user_id);
create index if not exists evaluations_question_id_idx on public.evaluations(question_id);

alter table public.evaluations enable row level security;

create policy "Users can view own evaluations"
on public.evaluations for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own evaluations"
on public.evaluations for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.answers a
    where a.id = answer_id and a.user_id = auth.uid()
  )
);

create policy "Users can update own evaluations"
on public.evaluations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own evaluations"
on public.evaluations for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_evaluations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evaluations_set_updated_at on public.evaluations;
create trigger evaluations_set_updated_at
before update on public.evaluations
for each row execute function public.set_evaluations_updated_at();

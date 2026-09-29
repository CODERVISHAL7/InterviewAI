create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_text text not null,
  category text not null,
  difficulty text not null,
  question_order integer not null,
  source text not null default 'AI-generated',
  created_at timestamptz not null default now(),
  constraint questions_order_positive check (question_order > 0),
  constraint questions_difficulty_check check (difficulty in ('Beginner','Intermediate','Advanced'))
);

create index if not exists questions_interview_id_idx on public.questions(interview_id);

alter table public.questions enable row level security;

create policy "Users can view questions for their interviews"
on public.questions
for select
to authenticated
using (
  exists (
    select 1 from public.interviews i
    where i.id = questions.interview_id
      and i.user_id = auth.uid()
  )
);

create policy "Users can insert questions for their interviews"
on public.questions
for insert
to authenticated
with check (
  exists (
    select 1 from public.interviews i
    where i.id = questions.interview_id
      and i.user_id = auth.uid()
  )
);

create policy "Users can update questions for their interviews"
on public.questions
for update
to authenticated
using (
  exists (
    select 1 from public.interviews i
    where i.id = questions.interview_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.interviews i
    where i.id = questions.interview_id
      and i.user_id = auth.uid()
  )
);

create policy "Users can delete questions for their interviews"
on public.questions
for delete
to authenticated
using (
  exists (
    select 1 from public.interviews i
    where i.id = questions.interview_id
      and i.user_id = auth.uid()
  )
);

-- Extend the Phase 3 status constraint for the AI-generation state.
alter table public.interviews drop constraint if exists interviews_status_check;
alter table public.interviews add constraint interviews_status_check check (status in ('setup', 'questions_generated', 'in_progress', 'completed', 'abandoned'));

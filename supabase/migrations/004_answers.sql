create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_text text not null default '',
  answer_method text not null default 'text' check (answer_method in ('text','voice')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists answers_user_id_idx on public.answers(user_id);
create index if not exists answers_question_id_idx on public.answers(question_id);

alter table public.answers enable row level security;

create policy "Users can view their own answers"
on public.answers for select to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own answers"
on public.answers for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.questions q
    join public.interviews i on i.id = q.interview_id
    where q.id = answers.question_id and i.user_id = auth.uid()
  )
);

create policy "Users can update their own answers"
on public.answers for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete their own answers"
on public.answers for delete to authenticated
using (user_id = auth.uid());

create or replace function public.set_answers_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists answers_updated_at on public.answers;
create trigger answers_updated_at
before update on public.answers
for each row execute function public.set_answers_updated_at();

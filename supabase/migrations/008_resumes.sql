create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size > 0),
  status text not null default 'uploaded' check (status in ('uploaded','processing','processed','failed')),
  raw_text text,
  parsed_data jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interviews
  add column if not exists resume_id uuid references public.resumes(id) on delete set null;

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists interviews_resume_id_idx on public.interviews(resume_id);

alter table public.resumes enable row level security;

drop policy if exists "Users can view own resumes" on public.resumes;
drop policy if exists "Users can insert own resumes" on public.resumes;
drop policy if exists "Users can update own resumes" on public.resumes;
drop policy if exists "Users can delete own resumes" on public.resumes;

create policy "Users can view own resumes" on public.resumes
for select using (auth.uid() = user_id);
create policy "Users can insert own resumes" on public.resumes
for insert with check (auth.uid() = user_id);
create policy "Users can update own resumes" on public.resumes
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own resumes" on public.resumes
for delete using (auth.uid() = user_id);

create or replace function public.set_resumes_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at before update on public.resumes
for each row execute function public.set_resumes_updated_at();

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload own resumes" on storage.objects;
drop policy if exists "Users can read own resumes" on storage.objects;
drop policy if exists "Users can update own resumes" on storage.objects;
drop policy if exists "Users can delete own resumes" on storage.objects;

create policy "Users can upload own resumes" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read own resumes" on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own resumes" on storage.objects
for update to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own resumes" on storage.objects
for delete to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to associate only their own resume with their own interview.
drop policy if exists "Users can update own interviews" on public.interviews;
create policy "Users can update own interviews" on public.interviews
for update using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (resume_id is null or exists (
    select 1 from public.resumes r
    where r.id = resume_id and r.user_id = auth.uid()
  ))
);

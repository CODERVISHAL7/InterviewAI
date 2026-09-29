# Phase 3 — Interview Configuration + Database

## Scope
Phase 3 creates a real interview configuration flow and persists each interview in Supabase PostgreSQL. AI question generation remains Phase 4.

## Added
- `interviews` table with user ownership, role, company, type, difficulty, skills, question count, status, timestamps and score placeholders.
- RLS policies for select/insert/update/delete based on `auth.uid() = user_id`.
- `interviews.updated_at` trigger.
- Interview setup form connected to Supabase.
- Profile target role and skills used as setup defaults.
- Interview preview page loads the created record and displays its configuration.
- Interview creation redirects using the created interview UUID.

## Database migration
Run `supabase/migrations/002_interviews.sql` in Supabase SQL Editor after `001_profiles.sql`.

## Phase boundary
No AI question generation, answer submission, voice, camera, evaluation or final scoring is implemented in this phase.

## Acceptance criteria
- Authenticated user can create an interview.
- Created interview is owned by the current user.
- Interview configuration persists after refresh.
- User can load their own interview preview.
- RLS prevents another user from reading or mutating the interview.
- AI generation is explicitly deferred to Phase 4.

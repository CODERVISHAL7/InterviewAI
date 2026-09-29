# Phase 4 — AI Question Generation

## Scope
Generate exactly the configured number of interview questions using a Supabase Edge Function and Gemini, then persist them in `public.questions`.

## Security
- Gemini API key is server-side only as `GEMINI_API_KEY`.
- The Edge Function validates the caller's Supabase session.
- The requested interview must belong to the authenticated user.
- Frontend never receives the Gemini API key.

## Supabase setup
1. Run `supabase/migrations/003_questions.sql` in SQL Editor.
2. Deploy `supabase/functions/generate-questions`.
3. Set Edge Function secrets: `GEMINI_API_KEY` and optionally `GEMINI_MODEL`.
4. Test from the interview preview page.

## Expected flow
Interview record → Generate AI Questions → Edge Function → Gemini structured JSON → questions rows → interview status `questions_generated`.

## Phase boundary
Answer evaluation, voice, camera/proctoring, reports, and resume processing remain later phases.

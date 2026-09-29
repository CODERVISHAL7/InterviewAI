# Phase 4 Setup & Verification

## 1. Database
Run `supabase/migrations/003_questions.sql` in the Supabase SQL Editor after the Phase 3 migration.

It creates `public.questions`, RLS policies, and extends interview status to include `questions_generated`.

## 2. Edge Function
Deploy the `supabase/functions/generate-questions` function with the Supabase CLI from the project root:

```bash
supabase functions deploy generate-questions
```

## 3. Edge Function secrets
Set these secrets in Supabase Edge Functions:

```text
GEMINI_API_KEY=your Gemini API key
GEMINI_MODEL=gemini-2.5-flash
```

Do not put these values in `js/config.js` or frontend source code.

The function also uses the standard Supabase Edge Function environment values (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) supplied by the Supabase runtime.

## 4. Frontend config
Keep the existing local browser configuration at:

```text
js/config.js
```

with the same `window.APP_CONFIG` structure used in Phase 2/3. Never put the Gemini API key here.

## 5. Test
1. Log in.
2. Create an interview.
3. Open the interview-ready page.
4. Click `Generate AI questions`.
5. Confirm the success message reports the configured question count.
6. In Supabase Table Editor, verify `questions` contains exactly that many rows for the interview.
7. Verify `interviews.status` is `questions_generated`.
8. Verify another user cannot select those questions through the app/RLS.

## Failure handling
If Gemini fails, the frontend should show an error and allow retry. The Gemini key is never returned to the browser.

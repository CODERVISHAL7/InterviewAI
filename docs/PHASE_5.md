# Phase 5 — Mock Interview + Answer Submission

## Scope
- Load a user's generated questions from Supabase.
- Present one question at a time.
- Provide a two-minute per-question timer.
- Capture text answers.
- Save/update answers in PostgreSQL.
- Allow previous/next navigation.
- Mark interview `in_progress` on start and `completed` after the final question.
- Protect answer records with RLS.

## Verification
- Run `004_answers.sql`.
- Create/open an interview with generated questions.
- Start the mock interview.
- Save an answer and verify it in `answers`.
- Refresh/reopen and confirm saved answers load.
- Complete all questions and verify interview status becomes `completed`.
- Verify another authenticated user cannot read/update/delete the first user's answers.

## Deferred
Voice input, camera/proctoring, AI evaluation, and report generation are later phases.

# Phase 10 — Dashboard & History

## Scope
- Load authenticated user's interview history from Supabase.
- Show dashboard statistics from `interviews`, `answers`, and `performance_reports`.
- Show overall-score trend for persisted reports.
- Show recent interviews and links to saved reports.
- Show full interview history with status, question counts, evaluation coverage, scores, and report access.

## Security
All reads are scoped to `auth.uid()` through the existing Supabase RLS policies. No new database migration is required for Phase 10.

## Verification
1. Dashboard loads for an authenticated user.
2. Counts match the user's Supabase rows.
3. Score trend uses persisted `performance_reports` only.
4. History shows only the signed-in user's interviews/reports.
5. Saved report links open the existing Phase 9 report.
6. Second-account isolation is verified before Phase 10 is marked passed.

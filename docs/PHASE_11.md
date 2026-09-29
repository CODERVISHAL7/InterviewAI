# Phase 11 — Resume-Based Questions

## Scope
- Optional PDF/DOC/DOCX resume upload during interview setup.
- Private Supabase Storage bucket `resumes` with per-user object policies.
- `resumes` table stores processing status and structured extracted context.
- `process-resume` Edge Function extracts resume text and sections.
- Interview records can reference a resume via `resume_id`.
- Question generation uses processed resume context and produces resume-grounded questions without inventing resume facts.

## Privacy boundary
- Resume storage is private.
- Only the authenticated owner can read/update/delete their resume record and storage object.
- Resume context is sent to the configured server-side AI provider only when generating questions for that user's interview.

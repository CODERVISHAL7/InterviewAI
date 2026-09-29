# Phase 8 — AI Answer Evaluation

## Scope
Evaluate a saved interview answer against its question using the same server-side multi-provider AI architecture used by Phase 4.

## Flow
1. Candidate saves an answer.
2. Candidate clicks **Evaluate answer**.
3. Browser calls the Supabase Edge Function `evaluate-answer`.
4. The Edge Function authenticates the user and verifies answer/question/interview ownership.
5. The Edge Function sends the question and answer to the configured AI provider.
6. Only the final structured evaluation is saved in `evaluations`.
7. The UI displays the overall score, dimension scores, feedback, and suggested answer.

## Stored evaluation fields
- score
- correctness
- relevance
- technical_knowledge
- completeness
- clarity
- communication
- feedback
- suggested_answer
- provider
- model

All score fields are 0–100. No chain-of-thought is stored or returned.

## Privacy/security boundary
- AI provider keys remain Supabase Edge Function secrets.
- Evaluation is authorized against the logged-in user.
- RLS isolates evaluation records by `user_id`.
- The answer text is sent to the configured AI provider only when the candidate explicitly requests evaluation.

## Verification checklist
- [ ] Run migration `006_evaluations.sql`.
- [ ] Deploy `evaluate-answer`.
- [ ] Evaluate a text answer.
- [ ] Verify evaluation appears in UI.
- [ ] Refresh/navigate and verify persistence.
- [ ] Evaluate a voice transcript.
- [ ] Verify `evaluations` row in Supabase.
- [ ] Verify RLS with a second user.
- [ ] Verify no AI key is exposed in browser source.

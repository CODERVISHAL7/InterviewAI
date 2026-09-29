# InterviewAI — AI-Based Smart Interview Preparation & Proctoring System

A from-scratch internship project using **HTML, CSS, Vanilla JavaScript, Supabase, PostgreSQL, Supabase Edge Functions, and Gemini API**.

## Current status

### Phase 0 — Complete
- Project scope and architecture defined.
- Technology boundaries defined.
- Security boundaries defined.
- Development phases defined.
- No existing code was available, so the project is initialized from scratch.

### Phase 1 — Complete
- Responsive landing page.
- Authentication page placeholders.
- Dashboard shell.
- Interview setup shell.
- Mock interview shell.
- Performance report shell.
- Interview history shell.
- Profile shell.
- Shared CSS components and responsive styles.
- Basic navigation and mobile menu.

### Phase 2 — Implemented
- Supabase Auth email/password registration and sign-in.
- Session protection for application pages.
- PostgreSQL `profiles` table with Row Level Security.
- Automatic profile creation trigger.
- Profile load/update flow.
- Local Supabase configuration template; no service-role key in frontend.

## Technology architecture

```text
Browser
├── HTML5
├── CSS3
└── Vanilla JavaScript
     │
     ▼
  Supabase
  ├── Auth
  ├── PostgreSQL
  ├── Storage
  └── Edge Functions
           │
           ▼
      Gemini API
```

## Planned phases

1. Phase 0 — Architecture and project foundation
2. Phase 1 — Frontend foundation
3. Phase 2 — Supabase authentication and profiles
4. Phase 3 — Interview configuration and database
5. Phase 4 — AI question generation
6. Phase 5 — Mock interview and answer capture
7. Phase 6 — Voice input / speech-to-text
8. Phase 7 — Camera and behavior indicators
9. Phase 8 — AI answer evaluation
10. Phase 9 — Performance report
11. Phase 10 — Dashboard and history
12. Phase 11 — Resume-based interviews
13. Phase 12 — HR practice and learning recommendations
14. Final — Security, testing, and deployment

## Security rules

- Never expose Gemini/OpenAI secret keys in browser JavaScript.
- AI provider calls will be made through Supabase Edge Functions.
- Database access will use Row Level Security.
- Users must only access their own records.
- Camera functionality will use explicit browser permission.
- Store structured interview behavior metrics rather than continuous raw video unless a future requirement explicitly needs otherwise.
- Behavior monitoring should report observable indicators, not claim that a user definitely cheated.

## Run locally

This Phase 1 frontend does not require a backend. Serve the folder with any static web server.

Example with VS Code Live Server:
1. Open the project folder.
2. Install/use Live Server.
3. Open `index.html` with Live Server.

Do not open files using `file://` if browser behavior differs; use a local HTTP server instead.

## Environment variables

Copy `.env.example` to your deployment environment later. Do not commit secrets.

## Phase 3 status

Phase 3 adds real interview configuration and persistence in Supabase. Run `supabase/migrations/002_interviews.sql` after the Phase 2 profile migration. The setup form creates an owned interview record and opens a saved interview preview. AI question generation starts in Phase 4.

Phase 7 added: camera + local integrity metrics with behavior_metrics migration.

## Phase 11
Phase 11 adds optional private resume upload and resume-grounded question generation. Run migration `008_resumes.sql`, then deploy `process-resume` and redeploy `generate-questions`.

## Phase 12
HR practice generation is tailored for HR/Mixed interviews, and personalized learning recommendations are persisted in `learning_recommendations` with RLS.

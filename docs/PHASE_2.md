# Phase 2 — Supabase Authentication & Profiles

## Implemented
- Supabase JS client integration through the official browser CDN.
- Local `js/config.js` configuration with `js/config.example.js` template.
- Email/password registration using Supabase Auth.
- Email/password sign-in using Supabase Auth.
- Session-based protection for dashboard, profile, interview, report, history, and interview setup pages.
- Sign-out action.
- `profiles` PostgreSQL table.
- Automatic profile creation from new auth users through a database trigger.
- Profile loading and updating.
- Row Level Security policies restricting profile access to the authenticated user.
- `updated_at` trigger for profile changes.

## Database migration
Run `supabase/migrations/001_profiles.sql` in the Supabase SQL Editor.

## Local configuration
1. Copy `js/config.example.js` to `js/config.js`.
2. Add the Supabase project URL and publishable/anon key.
3. Never use or expose a `service_role` key in browser code.

## Verification gate
Phase 2 is complete when:
- A new user can register through Supabase Auth.
- The user's profile row is created automatically.
- A registered user can sign in and reach protected pages.
- An unauthenticated user is redirected to login from protected pages.
- The signed-in user can load and update their own profile.
- RLS prevents access to another user's profile.
- Sign-out ends the session and returns to the landing page.


## Important local configuration detail
`config.js` must be located at `js/config.js` and define `window.APP_CONFIG` using the same structure as `js/config.example.js`. The Register page must use the Phase 2 authentication handler; there should be no Phase 1 placeholder alert.

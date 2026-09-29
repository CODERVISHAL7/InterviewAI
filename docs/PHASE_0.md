# Phase 0 — Project Foundation

## Scope
Build an AI-based interview preparation system for students and early-career candidates.

## Core requirements
- User registration/login
- Profile management
- Role selection
- AI-generated interview questions
- Mock interview mode
- Voice or text answers
- AI answer evaluation
- Structured feedback
- Resume-based questions
- Performance dashboard
- HR practice
- Learning recommendations
- Camera-based interview integrity indicators

## Technology constraints
- Frontend: HTML5, CSS3, Vanilla JavaScript ES6+
- Backend/BaaS: Supabase
- Database: PostgreSQL through Supabase
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Server-side AI integration: Supabase Edge Functions
- AI provider: Gemini API
- Charts: Chart.js

## Explicit non-goals for the first implementation
- No React/Next/Vue/Angular
- No Express/Node backend
- No fake AI responses presented as production AI
- No API secrets in frontend code
- No definitive claims that camera indicators prove cheating

## Data entities planned
- profiles
- interviews
- questions
- answers
- evaluations
- behavior_metrics
- reports
- resume_files

## Phase gate
Phase 0 is complete when the project has a documented architecture, technology boundaries, folder structure, security rules, and implementation sequence.

# Phase 9 — Overall Performance Report

## Scope
Aggregates stored answer evaluations into an interview-level report.

## Outputs
- Overall score and six evaluation dimensions
- Answered/evaluated question counts
- AI-generated strengths, weaknesses, and recommendations
- Read-only summary of persisted interview behavior metrics

## Privacy
Only aggregate behavior metrics are displayed; raw camera video is not stored by this feature.

## Security
The `performance_reports` table uses Supabase RLS keyed to `user_id`. The report Edge Function verifies the authenticated user owns the interview before generating or saving a report.

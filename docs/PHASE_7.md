# Phase 7 — Camera + Interview Behavior Monitoring

## Scope
Local browser camera capture and observable interview-integrity metrics. No continuous raw video is uploaded or stored.

## Metrics
- camera permission state
- face presence seconds
- multiple-face events
- out-of-frame events and duration
- head-away events based on face position in frame (not gaze inference)
- basic posture deviation events from pose landmarks

## Privacy boundary
Camera frames are processed in the browser. Only aggregate metrics are persisted to `behavior_metrics`.

## Important interpretation
These metrics are practice/integrity indicators. They do not prove cheating, intent, or misconduct.

## Browser/model fallback
If camera permission is denied, unsupported, or the local vision model cannot load, the interview remains usable and the limitation is recorded/displayed.

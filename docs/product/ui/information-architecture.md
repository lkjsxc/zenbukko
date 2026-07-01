# Information Architecture

## Purpose

Define screens and operator journeys.

## Screens

| Screen | Route | Goal |
|--------|-------|------|
| Dashboard | `#/` | System readiness, recent activity |
| Session | `#/session` | Import or replace session JSON |
| Courses | `#/courses` | Browse enrolled courses |
| Archive | `#/archive` | Configure and start study jobs |
| Jobs | `#/jobs` | Monitor jobs and live logs |
| Outputs | `#/outputs` | Browse generated artifacts |
| Settings | `#/settings` | OCR and Gemini configuration |

## Primary Journey

Session → Dashboard → Courses → Archive → Jobs → Outputs.

## Secondary Journeys

- Standalone OCR via Archive advanced panel or future dedicated action.
- Download all courses from Archive when session is ready.
- Settings changes apply to subsequent jobs.

## Invariants

Dashboard is default after successful auth. Session auto-loads on open when file exists.

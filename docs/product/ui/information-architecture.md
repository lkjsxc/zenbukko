# Information Architecture

## Purpose

Define screens and operator journeys.

## Screens

| Screen | Route | Goal |
|--------|-------|------|
| Dashboard | `#/` | System readiness, first-run guidance, recent activity |
| Session | `#/session` | Follow auth guidance, then import or replace session JSON |
| Courses | `#/courses` | Browse enrolled courses |
| Archive | `#/archive` | Configure and start study jobs |
| Jobs | `#/jobs` | Monitor jobs and live logs |
| Outputs | `#/outputs` | Browse generated artifacts |
| Settings | `#/settings` | Local OCR configuration |

## Primary Journey

Dashboard readiness → Session → Courses → Archive → Jobs → Outputs.

## Secondary Journeys

- Dashboard directs an operator without a session to Session before course actions.
- Standalone OCR via Archive advanced panel or CLI.
- Download all courses from Archive when session is ready.
- Settings changes apply to subsequent jobs.

## Invariants

Dashboard is default after startup. Its missing-session action routes to Session, where native/WSL2 `zenbukko auth` and Docker session-import paths are explained. Session auto-loads on open when file exists.

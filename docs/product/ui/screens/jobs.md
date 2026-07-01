# Jobs Screen

## Purpose

List jobs and stream live logs.

## Inputs

- `GET /api/jobs`
- `GET /api/jobs/:id/events` SSE for selected job

## Outputs

- Split view: job table + log panel.
- Status badges with colors.
- Error text for failed jobs.

## Invariants

One SSE connection per selected job. Event delegation on table body.

## Failure Behavior

SSE disconnect shows reconnect banner. Job list refresh does not stack listeners.

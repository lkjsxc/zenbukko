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

One SSE connection per selected job. Pending reconnects are cancelled when changing jobs or leaving Jobs. Log lines append without rerendering the screen. Event delegation is used on the table body.

## Failure Behavior

Empty job lists and missing selections have explicit states. SSE disconnect shows a persistent connection banner with exponential backoff. Job list refresh is throttled and does not stack listeners.

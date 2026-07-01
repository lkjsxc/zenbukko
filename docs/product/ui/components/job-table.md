# Job Table

## Purpose

Display persisted jobs with status and errors.

## Columns

ID, title, status badge, updated time, error (if failed).

## Interaction

Click row or ID button selects job and opens log stream.

## Invariants

Event delegation on `<tbody data-table="jobs">`. No per-row listener binding.

## Status Colors

queued: warning, running: accent, succeeded: success, failed: danger.

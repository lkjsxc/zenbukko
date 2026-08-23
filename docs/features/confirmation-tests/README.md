# Confirmation Tests

## Purpose

Download every confirmation test in the selected course chapters for offline
review without changing answers or progress.

## Files

- [`capture.md`](capture.md): discovery, saved content, and failure behavior.

## Invariants

- Confirmation-test capture is part of every `download` and `download-all` run.
- Capture performs authenticated reads only and never submits an answer.
- Every discovered test is represented as captured content or an explicit
  failure record.

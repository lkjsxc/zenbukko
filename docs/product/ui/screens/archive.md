# Archive Screen

## Purpose

Configure and start download or download-all jobs.

## Inputs

- Learning URL (prefilled from `?courseId=`).
- Visual chapter picker or advanced explicit IDs.
- Toggles: transcribe, materials, PDF OCR, delete media after transcript.
- Concurrency number input.

## Outputs

- `POST /api/jobs` with kind `download` or `download-all`.
- Redirect to `#/jobs/:id` on success.

## Invariants

`chapterRange` and explicit `chapters` are mutually exclusive.
Job-local chapter selection is not loaded from saved settings.

## Failure Behavior

Validation before POST. Submit button disabled while in flight.

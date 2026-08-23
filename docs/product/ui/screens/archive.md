# Archive Screen

## Purpose

Configure and start download or download-all jobs.

## Inputs

- Learning URL (prefilled from `?courseId=`).
- Visual chapter picker with a select-all action, or advanced explicit IDs.
- Processing options in order: download media, transcribe media, download
  materials, download confirmation tests, PDF OCR, delete media after
  transcript.
- Concurrency number input.
- Local OCR settings inherited from Settings and overridable by job payload when exposed.

## Outputs

- `POST /api/jobs` with kind `download` or `download-all`.
- Redirect to `#/jobs/:id` on success.

## Invariants

`chapterRange` and explicit `chapters` are mutually exclusive. An empty selection explicitly means the entire course. Job-local chapter selection is not loaded from saved settings.

Media and confirmation-test download are enabled by default. Media, materials,
and confirmation tests can each be disabled for a job. Transcription enables
and locks media download because it consumes the downloaded media. PDF OCR
enables and locks material capture because it consumes downloaded PDFs. Media
cleanup is available only when transcription is enabled. No remote provider
settings are included in the payload.

The download-all action is separated and described as a bulk operation.

## Failure Behavior

URL and concurrency validation appears inline before POST. Chapter loading failures provide retry. Both submit buttons are disabled while a request is in flight, and all input is retained after failure.

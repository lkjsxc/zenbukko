# Development Runbooks

## Purpose

Practical checklists for repeated maintenance workflows.

## OCR Backend Migration Check

1. Confirm local OCR backend is selected when available.
2. Confirm cloud credentials are optional in local-default mode.
3. Run a representative OCR job on a small material set.
4. Verify outputs and manifest fields include backend selection and statuses.
5. Re-run with forced mode and confirm failure behavior is isolated.

## Output Validation

1. Run backfill command: `rebuild-chapter-ocr --input /data/downloads`.
2. Confirm `chapter-<chapterId>_ocr.md` files are generated when lesson aggregates exist.
3. Confirm no OCR manifest rows are removed unexpectedly.
4. Verify `zenbukko ocr-materials` can rerun a single folder without altering unrelated chapter outputs.

## Recovery

- If cloud mode is unstable, set `ocrBackend: local` and resume from the same input directory.
- If local OCR is unavailable, document required dependency changes and set `ocrBackend: gemini`.

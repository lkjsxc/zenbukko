# Output Validation

## Checklist

1. Run backfill command: `rebuild-chapter-ocr --input /data/downloads`.
2. Confirm `chapter-<chapterId>_ocr.md` files are generated when lesson aggregates exist.
3. Confirm no OCR manifest rows are removed unexpectedly.
4. Verify `zenbukko ocr-materials` can rerun a single folder without altering unrelated chapter outputs.

## Docker Gate

OCR smoke checks that require packaged OCR binaries run from Docker images after build.

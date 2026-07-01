# Materials To OCR Pipeline

## Purpose

Describe the module boundary between material processing and local OCR.

## Stages

1. `lessonRunner` builds all selected lesson work items.
2. `materials` fetches reference pages and assets for every selected lesson before media transcription or OCR.
3. `materials/pdf` converts supported saved sources into PDFs.
4. `ocr/discovery` resolves manifest PDF entries.
5. `ocr/plan` builds runnable OCR tasks from freshness checks.
6. `ocr/preflight` checks local executables and device settings.
7. `ocr/local` rasterizes PDFs and runs NDLOCR-Lite.
8. OCR writing modules persist per-PDF Markdown and lesson manifests.
9. Chapter aggregation concatenates lesson OCR aggregates in chapter order.

## Invariants

The downloader owns network capture. The PDF normalizer owns local format conversion. OCR modules never need to understand HTML, images, or text source assets.

Material capture is a front-loaded phase. A slow OCR or transcription step must not prevent later selected lessons from receiving `*_materials` directories and manifests.

Chapter OCR aggregation is a local text operation. It must be safe to rerun for existing data without NNN access or media files.

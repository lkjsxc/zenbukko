# Materials To OCR Pipeline

## Purpose

Describe the ideal module boundary for material processing.

## Stages

1. `lessonRunner` builds all selected lesson work items.
2. `materials` fetches reference pages and assets for every selected lesson before media transcription or OCR.
3. `materials/pdf` converts supported saved sources into PDFs.
4. `geminiOcrDiscovery` resolves manifest PDF entries.
5. `geminiOcrPlan` builds runnable OCR tasks.
6. Gemini execution modules produce OCR text.
7. OCR writing modules persist per-PDF Markdown and lesson manifests.
8. Chapter aggregation concatenates lesson OCR aggregates in chapter order.

## Invariants

The downloader owns network capture. The PDF normalizer owns local format conversion. OCR modules never need to understand HTML, images, or text source assets.

Material capture is a front-loaded phase. A slow OCR or transcription step must not prevent later selected lessons from receiving `*_materials` directories and manifests.

Chapter OCR aggregation is a local text operation. It must be safe to rerun for existing data without Gemini, NNN, or media files.

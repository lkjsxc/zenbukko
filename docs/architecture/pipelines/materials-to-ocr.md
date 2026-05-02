# Materials To OCR Pipeline

## Purpose

Describe the ideal module boundary for material processing.

## Stages

1. `materials` fetches reference pages and assets.
2. `materials/pdf` converts supported saved sources into PDFs.
3. `geminiOcrDiscovery` resolves manifest PDF entries.
4. `geminiOcrPlan` builds runnable OCR tasks.
5. Gemini execution modules produce OCR text.
6. OCR writing modules persist Markdown and manifests.

## Invariants

The downloader owns network capture. The PDF normalizer owns local format conversion. OCR modules never need to understand HTML, images, or text source assets.

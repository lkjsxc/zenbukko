# PDF Normalization

## Purpose

Convert captured materials into a single OCR input format before Gemini sees them.

## Supported Inputs

- Existing PDF files are reused directly.
- Saved reference HTML pages are printed to PDF with Chromium.
- Downloaded HTML files are printed to PDF with Chromium.
- PNG and JPEG images are placed on printable pages and emitted as PDFs.
- Plain text and Markdown files are wrapped in simple readable HTML and emitted as PDFs.

## Unsupported Inputs

- Office documents, spreadsheets, presentations, archives, binary blobs, SVG, fonts, and scripts are preserved but skipped for OCR.
- Unsupported inputs must include a conversion status and message in the manifest.

## Output Rules

- Generated PDFs are written under `pdf/`.
- Names are stable and derived from the source relative path plus a short content-independent hash.
- Source PDFs keep their original path as `pdfFile`; generated PDFs set `pdfGenerated: true`.
- OCR eligibility is true only when the resolved `pdfFile` exists and is non-empty.

## Failure Behavior

If Chromium conversion fails for one source, the failure is recorded on that item and processing continues. OCR must not receive failed or missing generated PDFs.

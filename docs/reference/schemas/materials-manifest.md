# Materials Manifest Schema

## Purpose

`materials_manifest.json` is the bridge between material capture, PDF normalization, and OCR.

## Top-Level Fields

- `generatedAt`: ISO timestamp.
- `referencePages`: array of saved reference page records.
- `assets`: array of downloaded asset records.
- `pdfs`: array of normalized PDF records.

## Reference Page Record

- `url`: original reference page URL.
- `file`: saved HTML path relative to the material directory.
- `pdfFile`: optional normalized PDF path.
- `pdfGenerated`: true when Zenbukko generated the PDF.
- `ocrEligible`: true when OCR may use the PDF.
- `conversionStatus`: `converted`, `skipped`, or `failed`.
- `conversionMessage`: optional reason.

## Asset Record

Asset records include all reference page fields that apply plus:

- `sourcePageUrl`: reference page where the asset was found.
- `url`: original asset URL.

## PDF Record

- `sourceFile`: source file relative path.
- `pdfFile`: PDF relative path.
- `kind`: source classification.
- `status`: readiness status.
- `message`: optional reason.

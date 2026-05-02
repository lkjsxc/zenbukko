# Materials

## Purpose

Materials are lesson reference pages and linked files captured for offline use. The feature must produce both a browsable archive and an OCR-ready PDF set.

## Files

- [`pipeline.md`](pipeline.md): end-to-end material processing order.
- [`pdf-normalization.md`](pdf-normalization.md): conversion rules for source material formats.
- [`manifest.md`](manifest.md): material manifest contract.

## Invariants

- Every saved reference page and every supported asset has an explicit PDF normalization decision.
- OCR reads normalized PDFs, not arbitrary source files.
- Existing source assets are reused when they are non-empty.
- Generated PDFs live under `pdf/` inside the material directory.

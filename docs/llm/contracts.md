# LLM Contracts

## Locked Values

- `ocrBackend=auto|local|gemini`; default `auto`.
- `ocrMode=auto|batch|flex`; Gemini planning only.
- Web access defaults to loopback plus generated token.
- Core API defaults to loopback port `8788` and has no token by default.
- Web defaults to loopback port `8787`, stores only token data, and proxies `/api/*`.
- Office files are saved as assets and skipped for OCR.
- GPU Docker API services are the NDLOCR CUDA path when runtime support exists.

## Output Contracts

- Per-PDF OCR: `*_ocr.md`.
- Lesson OCR aggregate: `materials_ocr.md`.
- OCR manifest: `materials_ocr_manifest.json`.
- Chapter OCR aggregate: `chapter-<chapterId>_ocr.md`.

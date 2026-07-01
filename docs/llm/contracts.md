# LLM Contracts

## Locked Values

- OCR is local-only.
- Local OCR command default: `ndlocr-lite`.
- Local OCR device default: `cpu`.
- Local OCR page DPI default: `300`.
- Local OCR retains intermediates only when requested.
- Tate-chu-yoko handling is enabled by default.
- Web access defaults to trusted loopback or private-network exposure without a browser token.
- Core API defaults to loopback port `8788` and has no token by default.
- Web defaults to loopback port `8787` and proxies `/api/*`.
- Office files are saved as assets and skipped for OCR.
- GPU Docker API services are Linux NVIDIA CUDA only when runtime support exists.

## Output Contracts

- Per-PDF OCR: `*_ocr.md`.
- Lesson OCR aggregate: `materials_ocr.md`.
- OCR manifest: `materials_ocr_manifest.json`.
- Chapter OCR aggregate: `chapter-<chapterId>_ocr.md`.

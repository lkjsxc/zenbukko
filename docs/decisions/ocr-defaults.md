# Local OCR Defaults

## Decision

Zenbukko OCR is local-only. The default OCR runner is NDLOCR-Lite through the command `ndlocr-lite`, using `cpu`, 300 DPI, no retained intermediates, and tate-chu-yoko handling enabled.

## Consequences

- PDFs never leave the local machine or container for OCR.
- API keys, remote model names, and provider execution modes are not accepted settings.
- Missing local tools produce actionable diagnostics instead of switching execution paths.
- Office files are preserved as assets and explicitly skipped for OCR.
- GPU Docker services are Linux NVIDIA CUDA only when the GPU runtime is available.

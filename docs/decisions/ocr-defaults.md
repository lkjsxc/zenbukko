# OCR Defaults

## Decision

`ocrBackend` accepts `auto`, `local`, or `gemini`; the default is `auto`.

## Consequences

- `auto` attempts local OCR before Gemini recovery.
- `local` never requires a cloud API key.
- `gemini` requires Gemini credentials.
- `ocrMode` is a Gemini planning setting only.
- Office files are preserved as assets and explicitly skipped for OCR.
- GPU Docker services run NDLOCR with CUDA when the GPU runtime is available.

# OCR Backend Check

## Checklist

1. Confirm `ocrBackend=auto` selects local OCR when available.
2. Confirm cloud credentials are optional for local OCR.
3. Run a representative OCR job on a small material set.
4. Verify outputs and manifest fields include backend selection and statuses.
5. Re-run with `ocrBackend=local` and `ocrBackend=gemini` to confirm isolated failure behavior.

## Recovery

- If Gemini is unstable, set `ocrBackend: local` and resume from the same input directory.
- If local OCR is unavailable, document required dependency changes and set `ocrBackend: gemini`.

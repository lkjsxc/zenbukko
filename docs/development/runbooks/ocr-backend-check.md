# Local OCR Check

## Checklist

1. Confirm `pdftoppm` resolves on `PATH`.
2. Confirm the configured OCR command resolves on `PATH` or by absolute path.
3. Confirm the selected device is `cpu` or a supported Linux NVIDIA CUDA setup.
4. Run a representative OCR job on a small material set.
5. Verify outputs and manifest fields include local command, device, diagnostics, and statuses.

## Recovery

- If `pdftoppm` is missing, install Poppler tools.
- If the OCR command is missing, install NDLOCR-Lite or set `ZENBUKKO_NDLOCR_CMD`.
- If CUDA fails, switch to `ZENBUKKO_NDLOCR_DEVICE=cpu` unless the host is a verified Linux NVIDIA CUDA system.

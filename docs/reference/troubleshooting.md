# Troubleshooting

## Session Missing

Run `zenbukko auth` or paste a valid session JSON into the web UI. Verify `ZENBUKKO_SESSION_PATH` points at the expected file.

## No Courses Found

Run `zenbukko list-courses --format json` and inspect whether the account has visible courses and on-demand labels.

## Local OCR Fails

Verify `ndlocr-lite`, Poppler `pdftoppm`, PDF readability, and Docker image readiness when using Compose.

Useful checks:

```sh
command -v ndlocr-lite
command -v pdftoppm
zenbukko ocr-materials --input data/downloads --force
```

If CUDA is selected, confirm the local NDLOCR-Lite install supports CUDA on this Linux NVIDIA host. Otherwise select `cpu`.

## Whisper Fails

Run `zenbukko setup-whisper --backend auto --model large-v3-turbo`. Verify ffmpeg is installed or use Docker.

## GPU Not Used

Check `ZENBUKKO_WHISPER_BACKEND`, Docker GPU profile, NVIDIA Container Toolkit, and whether CUDA whisper build artifacts exist. Docker GPU services are Linux NVIDIA CUDA only.

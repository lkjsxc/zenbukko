# Troubleshooting

## Session Missing

Run `zenbukko auth` or paste a valid session JSON into the web UI. Verify `ZENBUKKO_SESSION_PATH` points at the expected file.

## No Courses Found

Run `zenbukko list-courses --format json` and inspect whether the account has visible courses and on-demand labels.

## Gemini OCR Fails

Verify `GEMINI_API_KEY`, model name, PDF size, network access, and whether Flex capacity is returning 429 or 503. Retry later or use Batch for larger work.

## Whisper Fails

Run `zenbukko setup-whisper --backend auto --model large-v3-turbo`. Verify ffmpeg is installed or use Docker.

## GPU Not Used

Check `ZENBUKKO_WHISPER_BACKEND`, Docker GPU profile, NVIDIA Container Toolkit, and whether CUDA whisper build artifacts exist.

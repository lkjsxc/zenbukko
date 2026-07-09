# CLI Usage

## Purpose

Run Zenbukko directly with Node or through the packaged `zenbukko` binary.

## Commands

```sh
zenbukko auth
zenbukko list-courses --format table
zenbukko download --course-id 12345 --chapter-range 1-3 --materials
zenbukko download-all --materials --ocr-materials
zenbukko ocr-materials --input /data/downloads/course-12345
zenbukko rebuild-chapter-ocr --input /data/downloads
zenbukko build-report-prompt --input /data/downloads/course-12345/01 --course-name "Mathematics History"
zenbukko api --host 127.0.0.1 --port 8788
zenbukko web --host 127.0.0.1 --port 8787 --api-url http://127.0.0.1:8788
zenbukko setup-whisper --backend auto --model large-v3-turbo
zenbukko transcribe --input lesson.ts --format txt
```

`auth` opens the interactive NNN login page at about 25% CSS zoom so the page fits smaller remote or container displays without changing Chromium device scale.

`api` starts the Core API that owns `/api/*`, `/healthz`, jobs, settings, outputs, OCR, transcription, and downloads. `web` starts the static UI and same-origin proxy.

## Chapter Selection

- `--chapter <id>` is an advanced option for explicit NNN chapter IDs.
- `--chapter-range <range>` selects one-based chapter ordinals in course order.
- Valid range syntax includes `1`, `1-15`, and `1,3-5`.
- Lesson IDs can be selected with repeated `--lesson-id <id>`.

## OCR Options

`--ocr-materials` enables local OCR after material capture.

Local OCR flags are available on `download`, `download-all`, and `ocr-materials`:

- `--ndlocr-command <path>` selects the OCR executable.
- `--ndlocr-device cpu|cuda` selects local device.
- `--ocr-page-dpi <n>` selects PDF rasterization DPI.
- `--ocr-keep-intermediates` retains local page images and raw text output.
- `--ndlocr-enable-tcy` and `--no-ndlocr-enable-tcy` control tate-chu-yoko handling.
- `--ocr-force` or `--force` reruns OCR even when Markdown is fresh.

## Local Rebuilds

`rebuild-chapter-ocr` scans existing downloaded lesson materials and rewrites `chapter-<chapterId>_ocr.md` files. It does not call OCR tools and is the preferred way to backfill chapter OCR after older runs.

## Report Prompts

`build-report-prompt` scans existing OCR and transcript artifacts and writes a prompt that leaves the report topic as `{{REPORT_TOPIC}}` unless `--topic` is provided. It does not generate the final report body.

## Failure Behavior

Commands exit non-zero when required session data, course data, local binaries, or output writes fail.

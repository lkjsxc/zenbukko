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
zenbukko setup-whisper --backend auto --model large-v3-turbo
zenbukko transcribe --input lesson.ts --format txt
```

## Chapter Selection

- `--chapter <id>` is an advanced option for explicit NNN chapter IDs.
- `--chapter-range <range>` selects one-based chapter ordinals in course order.
- Valid range syntax includes `1`, `1-15`, and `1,3-5`.
- Lesson IDs can be selected with repeated `--lesson-id <id>`.

## OCR Options

- `--ocr-backend auto|local|gemini` selects OCR backend policy; the default is `auto`.
- `--ocr-mode auto|batch|flex` controls Gemini OCR planning.
- `--ocr-service-tier flex|standard` controls Gemini synchronous tier.
- `ocrBackend=auto` prefers local OCR when available, then uses Gemini recovery when configured.
- `ocrMode=auto` uses Gemini Batch for multi-PDF work and Flex for small or recovery work.

## Local Rebuilds

`rebuild-chapter-ocr` scans existing downloaded lesson materials and rewrites `chapter-<chapterId>_ocr.md` files. It does not call OCR services and is the preferred way to backfill chapter OCR after older runs.

## Failure Behavior

Commands exit non-zero when required session data, course data, OCR provider credentials, local binaries, or output writes fail.

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
zenbukko setup-whisper --backend auto --model large-v3-turbo
zenbukko transcribe --input lesson.ts --format txt
```

## Chapter Selection

- `--chapter <id>` is an advanced option for explicit NNN chapter IDs.
- `--chapter-range <range>` selects one-based chapter ordinals in course order.
- Valid range syntax includes `1`, `1-15`, and `1,3-5`.
- Lesson IDs can be selected with repeated `--lesson-id <id>`.

## OCR Options

- `--ocr-mode auto|batch|flex` controls OCR planning.
- `--ocr-service-tier flex|standard` controls synchronous fallback tier.
- `auto` chooses Batch for multi-PDF/background work and Flex for single/small work and Batch recovery.

## Failure Behavior

Commands exit non-zero when required session data, course data, Gemini keys, local binaries, or output writes fail.

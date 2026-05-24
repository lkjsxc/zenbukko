# File Layout

## Purpose

Identify persistent and generated paths.

## Docker Defaults

```text
/data/session.json
/data/api/settings.json
/data/api/jobs/*.json
/data/api/jobs/*.log
/data/web-ui/token.json
/data/downloads/
  course-<courseId>/
    <chapterOrdinal>/
      chapter-<chapterId>_ocr.md
      chapter-<chapterId>_transcription.md
      report_prompt.md
```

## Repository Paths

```text
src/
docs/
data/
Dockerfile
Dockerfile.gpu
Dockerfile.web
docker-compose.yml
```

## Material Outputs

See [`outputs/`](outputs/README.md) for the artifact-level contract.

```text
reference_*.html
assets/*
pdf/*.pdf
materials_manifest.json
index.html
*_ocr.md
materials_ocr.md
materials_ocr_manifest.json
chapter-<chapterId>_ocr.md
chapter-<chapterId>_transcription.md
report_prompt.md
```

## Invariants

Local private data belongs in `data/` or external paths, not in source directories.

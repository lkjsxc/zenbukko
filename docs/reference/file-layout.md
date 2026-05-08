# File Layout

## Purpose

Identify persistent and generated paths.

## Docker Defaults

```text
/data/session.json
/data/web/settings.json
/data/web/jobs/*.json
/data/web/jobs/*.log
/data/downloads/
  course-<courseId>/
    <chapterOrdinal>/
      chapter-<chapterId>_ocr.md
      chapter-<chapterId>_transcription.md
```

## Repository Paths

```text
src/
docs/
data/
Dockerfile
Dockerfile.gpu
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
```

## Invariants

Local private data belongs in `data/` or external paths, not in source directories.

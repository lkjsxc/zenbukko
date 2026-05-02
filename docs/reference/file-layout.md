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

```text
reference_*.html
assets/*
pdf/*.pdf
materials_manifest.json
index.html
*_ocr.md
materials_ocr.md
materials_ocr_manifest.json
```

## Invariants

Local private data belongs in `data/` or external paths, not in source directories.

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

## Invariants

Local private data belongs in `data/` or external paths, not in source directories.

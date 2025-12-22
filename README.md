# Zenbukko (rewrite)

This is the Node 22 + TypeScript rewrite.

## Docker Compose (recommended for transcription)

Prereq: run `zenbukko auth` on your host to create a session at `~/.config/zenbukko/session.json`.

- Build image:
  - `docker compose build zenbukko`

- Download a course:
  - `docker compose run --rm zenbukko download --course-id <COURSE_ID>`

- Download a course + materials (offline-openable HTML):
  - `docker compose run --rm zenbukko download --course-id <COURSE_ID> --materials`
  - Open `downloads/course-<id>/chapter-<id>/lesson-<id>_materials/index.html` in your browser.

- One-command pipeline (video + materials + wav + transcription) for the first resolved lesson:
  - `docker compose run --rm zenbukko download --course-id <COURSE_ID> --first-lecture-only --materials --transcribe`

- One-command pipeline for a specific lecture (repeat `--lesson-id` to download multiple):
  - `docker compose run --rm zenbukko download --course-id <COURSE_ID> --lesson-id <LESSON_ID> --materials --transcribe`
  - Optional transcription flags: `--transcribe-language ja|en|auto`, `--transcribe-model base|small|...`, `--transcribe-format txt|srt|vtt`.

- Transcribe a downloaded `.ts` file:
  - `docker compose run --rm zenbukko transcribe --input /data/downloads/<...>.ts --model base --format txt`

Notes:
- `docker-compose.yml` mounts your host `~/.config/zenbukko/` into the container (read-only).
- Downloads are written under `downloads/` on the host (mounted as `/data/downloads`).

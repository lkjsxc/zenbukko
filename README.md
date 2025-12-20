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

- Download Lecture 1 and transcribe it (single command):
  - `docker compose run --rm zenbukko download-lecture1 --course-id <COURSE_ID> --transcribe`

- Download Lecture 1 video + materials (references/handouts) + transcript:
  - Materials are downloaded by default into `lesson-<id>_materials/` next to the video.
  - Open `lesson-<id>_materials/index.html` for an offline viewer.
  - Disable materials with `--no-materials`.

- Transcribe a downloaded `.ts` file:
  - `docker compose run --rm zenbukko transcribe --input /data/downloads/<...>.ts --model base --format txt`

Notes:
- `docker-compose.yml` mounts your host `~/.config/zenbukko/` into the container (read-only).
- Downloads are written under `downloads/` on the host (mounted as `/data/downloads`).

## 日本語メモ

- セッションはデフォルトで `~/.config/zenbukko/session.json` に保存されます。
- `docker compose run --rm zenbukko download-lecture1 --course-id <COURSE_ID> --transcribe` で、動画(.ts) + 文字起こし(txt)をまとめて生成できます。
- `download-lecture1` は資料(参照リンク)もデフォルトで `lesson-<id>_materials/` に保存します。不要なら `--no-materials`。

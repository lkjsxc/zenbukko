
# Zenbukko

Zenbukko is a Docker-first CLI that:

- Authenticates via a real browser login and saves a reusable cookie session.
- Resolves course → chapters → lessons and their signed HLS URLs.
- Downloads lesson videos (HLS) into `.ts` files.
- Optionally downloads lesson materials into an offline-openable `index.html`.
- Optionally extracts audio with `ffmpeg` and transcribes with `whisper.cpp`.
- Optionally writes a chapter-level aggregated Markdown transcript.

This repository is the Node.js 22 + TypeScript rewrite.

## Quick start (Docker Compose recommended)

### 1 Authenticate on the host

Authentication is easiest on your host machine (not inside Docker).

```bash
npm ci
npm run build
node dist/index.js auth
```

By default, the session is saved to `./data/session.json` (relative to your current working directory).

Tip: run commands from the repo root so the session ends up at `./data/session.json` in this repository.

### 2 Build the Docker image

```bash
docker compose build zenbukko
```

### 3 List courses

Once you have a session file at `./data/session.json`, you can list the courses available to your account.

Using Docker Compose:

```bash
docker compose run --rm zenbukko list-courses
```

Optional JSON output:

```bash
docker compose run --rm zenbukko list-courses --format json
```

### 4 Download + transcribe

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --materials --transcribe
```

What this does:

- Writes outputs to `./data/downloads/` on your host.
- Reuses your host session file (mounted read-only into the container).

### 5 Download all on-demand courses (bulk)

Download all on-demand courses visible to your account. This can take a long time and use a lot of disk.

```bash
docker compose run --rm zenbukko download-all --materials --transcribe
```

Notes:

- Zenbukko identifies “on-demand” courses based on the course list UI (tab/labels). This is best-effort.
- Transcription language defaults to Japanese (`--transcribe-language ja`).
- The command is resumable: existing media/transcripts are skipped.

## Commands

Global options (apply to all commands):

- `--session <path>`: override the session file path.
- `--output <path>`: override the output directory.
- `--headless`: run Puppeteer in headless mode.
- `--log-level <level>`: `silent|error|warn|info|debug`.

### `auth`

Open a real browser, log in, and save cookies to the session file.

```bash
node dist/index.js auth
```

Notes:

- In Docker Compose, `PUPPETEER_HEADLESS` is set to `true` by default.
- The provided `docker-compose.yml` mounts `./data` into the container, so `auth` is intended to run on the host.

### `list-courses`

List courses available to the authenticated user.

```bash
node dist/index.js list-courses
node dist/index.js list-courses --format json
```

### `download`

Download lessons for a course (HLS → `.ts`). Optionally download materials and transcribe.

Minimal:

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID>
```

Download materials (offline HTML):

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --materials
```

Download + transcribe (the “one command” pipeline):

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --materials --transcribe
```

Scope selection:

- Specific chapter(s) (repeatable):

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --chapter <CHAPTER_ID> --materials --transcribe
```

- Specific lesson(s) (repeatable):

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --lesson-id <LESSON_ID> --lesson-id <LESSON_ID_2> --materials --transcribe
```

- First resolved lesson only:

```bash
docker compose run --rm zenbukko download --course-id <COURSE_ID> --first-lecture-only --materials --transcribe
```

Transcription options:

- `--transcribe-model <name>`: Whisper model name (default: `base`).
- `--transcribe-format <fmt>`: `txt|srt|vtt` (default: `txt`).
- `--transcribe-language <code>`: language code to force (default: `ja`).
- `--no-speech-thold <n>`: whisper.cpp no-speech threshold (lower can reduce `[BLANK_AUDIO]`, e.g. `0.2`).
- `--max-seconds <n>`: transcribe only the first N seconds (useful for quick tests).

Behavior notes:

- If a media file already exists and is non-empty, download is skipped.
- If a transcript exists, it is skipped (for `txt`, Zenbukko will re-transcribe if the content looks empty or is `[BLANK_AUDIO]`).

### `download-all`

Download all on-demand courses (HLS → `.ts`). Optionally download materials and transcribe.

```bash
docker compose run --rm zenbukko download-all --materials --transcribe
```

Options (subset of `download`):

- `--max-concurrency <n>`: max API concurrency when resolving lesson URLs.
- `--transcribe`, `--transcribe-model <name>`, `--transcribe-format <fmt>`.
- `--transcribe-language <code>`: defaults to `ja`.
- `--no-speech-thold <n>`, `--max-seconds <n>`.
- `--materials`.

### `transcribe`

Transcribe a local media file (uses `ffmpeg` to extract audio when needed).

```bash
docker compose run --rm zenbukko transcribe --input /data/downloads/<path>.ts --model base --format txt --language ja
```

Options:

- `--model <name>`: Whisper model name.
- `--format <fmt>`: `txt|srt|vtt`.
- `--language <code>`: optional language code.
- `--no-speech-thold <n>`: optional no-speech threshold.
- `--max-seconds <n>`: optional limit for faster testing.

### `setup-whisper`

Clone/build `whisper.cpp` and download a model.

```bash
docker compose run --rm zenbukko setup-whisper --model base
```

Note: the Docker image in this repo runs `setup-whisper --model base` at build time, so transcription works out of the box in Docker.

## Output layout

By default, outputs are written under `./data/downloads`.

Course/chapter structure:

```text
data/downloads/
  course-<COURSE_ID>/
    01/
      01/
        lesson-<LESSON_ID>.ts
        lesson-<LESSON_ID>_transcription.txt
        lesson-<LESSON_ID>_materials/
          index.html
          assets/
      02/
        ...
      chapter-<CHAPTER_ID>_transcription.md
    02/
      ...
```

Notes:

- Chapter folders are sequential numbers (`01`, `02`, `03`, ...) based on the course chapter order.
- Lessons are placed into per-chapter numeric directories: `01`, `02`, `03`, ...
- If a lesson has multiple video parts, files are suffixed with `_part-<n>`.
- The chapter-level aggregated transcript is only generated when:
  - `--transcribe` is enabled, and
  - `--transcribe-format txt`

The aggregated Markdown format is:

- `## 01 <lesson title>`
- `## 02 <lesson title>`
- ...

Multi-part lessons are concatenated with no extra headings.

## Configuration

Environment variables:

- `ZENBUKKO_SESSION_PATH`: override the session path.
- `OUTPUT_DIR`: override the output directory.
- `LOG_LEVEL`: `silent|error|warn|info|debug`.
- `PUPPETEER_HEADLESS`: `true|false`.

Docker Compose defaults (see `docker-compose.yml`):

- Host `./data` is mounted to `/data`.
- Session file path is `/data/session.json`.
- Downloads output directory is `/data/downloads`.

## Troubleshooting

### “No session found … Run: zenbukko auth”

Run auth on the host:

```bash
node dist/index.js auth
```

Then re-run Docker Compose commands.

### Puppeteer / Chromium issues

- Docker uses system Chromium (configured in the Dockerfile).
- If you want to run `auth` in Docker, you must mount a writable config dir (the default compose mount is read-only).

### Transcription quality / `[BLANK_AUDIO]`

- Try forcing the language: `--transcribe-language ja`.
- Try lowering the no-speech threshold: `--no-speech-thold 0.2`.

## License

Apache License 2.0. See [LICENSE](LICENSE).

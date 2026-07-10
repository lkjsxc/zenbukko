# Native Local Setup

## Purpose

Run Zenbukko without Docker. This is the development or host-tools path; use the Docker Compose CPU profile first for the simplest supported setup because it installs NDLOCR-Lite and the other local OCR tools automatically. Windows, macOS, and Linux use the same built JavaScript entrypoint; OCR and transcription stay on the local machine.

## Install JavaScript Dependencies

Node.js 22 or newer is required. Install both workspaces with one package manager:

```sh
# npm, using committed lockfiles
npm ci
npm --prefix web-ui ci
npm run build

# pnpm, when npm is unavailable
pnpm install --no-lockfile  # installs the web-ui workspace too
pnpm run build
```

Build and type-check scripts are package-manager neutral after dependencies are installed. Run commands without a global link as `node dist/index.js <command>`.

## Native Diagnostic

```sh
node dist/index.js doctor
node dist/index.js doctor --json
```

The diagnostic reports Node, package managers, browser, ffmpeg, Poppler, NDLOCR-Lite, whisper.cpp/model, session, writable paths, and built Web assets. It never reads or prints session cookie contents.

## Shared Requirements

- A detected Edge, Chrome, or Chromium executable for auth, course discovery, and HTML-to-PDF conversion.
- ffmpeg for media handling; the bundled `ffmpeg-static` binary is accepted when present.
- Poppler `pdftoppm` for OCR.
- NDLOCR-Lite on `PATH` or configured with `ZENBUKKO_NDLOCR_CMD`.
- A whisper.cpp binary and model for transcription.

Browser precedence is explicit `PUPPETEER_EXECUTABLE_PATH`, Puppeteer's downloaded browser, then common system Edge/Chrome/Chromium locations and `PATH`.

## Windows And WSL2

Prefer WSL2 plus Docker Desktop integration for a new Windows setup. Keep the checkout in the Linux filesystem, enable the distribution in Docker Desktop, and follow [`docker-compose.md`](docker-compose.md). This avoids manual Windows OCR and Whisper installation.

Native Windows is supported for auth, course listing, API/Web, downloads, material PDF rendering, and OCR when required executables are installed. Example with an explicit bundled Node:

```powershell
$node = "C:\path\to\node.exe"
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files (x86)\Microsoft\Edge Beta\Application\msedge.exe" # optional when auto-detected
& $node dist/index.js doctor
& $node dist/index.js auth
& $node dist/index.js list-courses --format table --headless
& $node dist/index.js api --host 127.0.0.1 --port 8788
# In another terminal:
& $node dist/index.js web --host 127.0.0.1 --port 8787 --api-url http://127.0.0.1:8788
```

Install ffmpeg and Poppler with a trusted Windows package source and ensure `ffmpeg.exe` and `pdftoppm.exe` are on `PATH`. Set an absolute NDLOCR path when needed:

```powershell
$env:ZENBUKKO_NDLOCR_CMD = "C:\path\to\ndlocr-lite.exe"
```

`setup-whisper` currently requires Git, CMake, and Unix-compatible build/download tooling. On native Windows, install whisper.cpp manually under `whisper.cpp`, including `whisper-cli.exe` and `models\ggml-<model>.bin`, or use WSL2 for that setup step. The runtime recognizes Windows `.exe` binaries.

## macOS

On Intel and Apple-silicon Macs, prefer Docker Desktop and the CPU Compose profile. It defaults to the AMD64 compatibility layer so the pinned OCR stack starts without a host NDLOCR-Lite installation. Use the following native path only when you need host tools:

```sh
brew install node ffmpeg poppler
npm ci && npm --prefix web-ui ci
npm run build
node dist/index.js setup-whisper --backend cpu --model large-v3-turbo
```

Install NDLOCR-Lite by its project instructions and set `ZENBUKKO_NDLOCR_CMD` when it is not on `PATH`.

## Linux

```sh
sudo apt-get update
sudo apt-get install -y ffmpeg poppler-utils chromium
npm ci && npm --prefix web-ui ci
npm run build
node dist/index.js setup-whisper --backend cpu --model large-v3-turbo
```

Linux NVIDIA hosts may select CUDA only when their local OCR and whisper.cpp builds support it.

## Native Verification

```sh
node dist/index.js doctor
npm run type-check   # or: pnpm run type-check
npm run lint         # or: pnpm run lint
npm test             # or: pnpm test
npm run build        # or: pnpm run build
```

Do not run downloads, OCR, or transcription as a smoke check unless the intended input and workload have been explicitly selected.

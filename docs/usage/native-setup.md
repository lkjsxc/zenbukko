# Native Local Setup

## Purpose

Run Zenbukko without Docker while keeping OCR and transcription on the local machine.

## Shared Requirements

- Node.js 22 or newer.
- ffmpeg for media handling.
- Poppler tools, especially `pdftoppm`.
- Chromium dependencies for authentication and HTML-to-PDF conversion.
- NDLOCR-Lite executable available on `PATH` or configured with `ZENBUKKO_NDLOCR_CMD`.
- whisper.cpp installed through `zenbukko setup-whisper` or available under the expected local path.

## macOS

Install system tools with Homebrew where possible:

```sh
brew install node ffmpeg poppler
npm install
npm run build
zenbukko setup-whisper --backend cpu --model large-v3-turbo
```

Install NDLOCR-Lite by its project instructions, then set:

```sh
export ZENBUKKO_NDLOCR_CMD=/path/to/ndlocr-lite
export ZENBUKKO_NDLOCR_DEVICE=cpu
```

Use CPU local OCR on macOS unless the installed local runner explicitly supports another device.

## Linux

Install packages from the distribution and project sources:

```sh
sudo apt-get update
sudo apt-get install -y ffmpeg poppler-utils chromium
npm install
npm run build
zenbukko setup-whisper --backend cpu --model large-v3-turbo
```

Install NDLOCR-Lite and verify:

```sh
command -v ndlocr-lite
command -v pdftoppm
```

Linux NVIDIA hosts may use `ZENBUKKO_NDLOCR_DEVICE=cuda` only when the local OCR executable supports CUDA.

## Windows

Use WSL2 Linux setup or CPU Docker containers for the verified path. Host-native Windows may work if Node 22, ffmpeg, Poppler, Chromium, NDLOCR-Lite, and whisper.cpp are installed and on `PATH`, but it is not the primary verified path.

## Smoke Checks

```sh
npm run type-check
npm test
zenbukko ocr-materials --input data/downloads --force
```

The OCR command requires existing normalized PDFs under the input path.

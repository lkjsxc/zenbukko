# Troubleshooting

## Start with Doctor

```sh
node dist/index.js doctor
node dist/index.js doctor --json
```

The diagnostic reports all missing native dependencies together and gives the setting or installation step needed next. It does not print session contents.

## Browser Not Found

Zenbukko checks `PUPPETEER_EXECUTABLE_PATH`, Puppeteer's downloaded browser, common Edge/Chrome/Chromium installations, then `PATH`. On Windows PowerShell, set an explicit path when auto-detection cannot find a supported installation:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files (x86)\Microsoft\Edge Beta\Application\msedge.exe"
```

An explicitly configured path must exist; Zenbukko does not silently fall back from a typo.

## Session Missing or Expired

Run `node dist/index.js auth`, complete login, return to the terminal, and press Enter. The browser and terminal input are released after saving. Never paste session JSON into support logs.

Then verify:

```sh
node dist/index.js list-courses --format json --headless
```

A login page response, 401/403, or no authenticated course content indicates that the session should be replaced.

## Web UI Not Built

If Web starts without usable static assets, install the `web-ui` workspace and rebuild:

```sh
npm --prefix web-ui ci
npm run build
```

With pnpm, use `pnpm --dir web-ui install --no-lockfile` and `pnpm run build`.

## Local OCR Fails

Check the exact paths reported for `pdftoppm` and NDLOCR-Lite. Configure the latter with `ZENBUKKO_NDLOCR_CMD`. Unreadable or empty PDFs fail individually and do not erase successful OCR from other PDFs.

If CUDA is selected, confirm the local NDLOCR-Lite install supports the host GPU. Otherwise select CPU.

## Whisper Fails

Check ffmpeg, the whisper binary, and the selected model independently in `doctor`. Native Windows recognizes `whisper-cli.exe`, but `setup-whisper` still requires Unix-compatible build/download tooling; install manually or use WSL2 for setup.

## Port Already in Use

Keep native defaults on loopback: API `127.0.0.1:8788`, Web `127.0.0.1:8787`. Stop the existing process or select another port. Do not bind Core API publicly without a separate access-control boundary.

## GPU Not Used

Check `ZENBUKKO_WHISPER_BACKEND`, Docker GPU profile, NVIDIA Container Toolkit, and CUDA build artifacts. Docker GPU services are Linux NVIDIA CUDA only.

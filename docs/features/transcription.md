# Transcription

## Purpose

Create local transcripts with whisper.cpp.

## Inputs

- Media file path.
- Whisper model name.
- Optional language, output format, no-speech threshold, max seconds, and backend.

## Backends

- `ZENBUKKO_WHISPER_BACKEND=auto|cpu|cuda` selects runtime preference.
- `auto` prefers CUDA when a CUDA build exists and falls back to CPU.
- `setup-whisper --backend cpu|cuda|both` builds requested backends.

## Outputs

- Extracted `.wav` when input is not already WAV.
- Transcript file matching requested `txt`, `srt`, or `vtt` format.

## Failure Behavior

Missing ffmpeg, whisper binary, or model file fails before transcription starts.

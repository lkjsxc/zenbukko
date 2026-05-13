# Transcription

## Purpose

Create local transcripts with whisper.cpp.

## Files

- [`whisper.md`](whisper.md): backend selection and setup behavior.
- [`outputs.md`](outputs.md): transcript artifact contract.

## Failure Behavior

Missing ffmpeg, whisper binary, or model file fails before transcription starts.

# Transcription

## Purpose

Create local transcripts with whisper.cpp.

## Files

- [`whisper.md`](whisper.md): local backend selection and setup behavior.
- [`outputs.md`](outputs.md): transcript artifact contract.
- [`../../usage/native-setup.md`](../../usage/native-setup.md): platform setup notes.

## Failure Behavior

Missing ffmpeg, whisper binary, or model file fails before transcription starts.

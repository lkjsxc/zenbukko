# Whisper Runtime

## Inputs

- Media file path and a safe Whisper model name.
- Optional language, output format, no-speech threshold, maximum duration, and requested backend.

## Backends

`ZENBUKKO_WHISPER_BACKEND` and the equivalent CLI option accept `auto`, `cpu`, `cuda`, or `vulkan`.

- An explicit `cpu`, `cuda`, or `vulkan` request requires that backend. Zenbukko never reruns an explicit GPU transcription on CPU because a Whisper command failed.
- `auto` checks usable backends in deterministic order: CUDA, Vulkan, CPU.
- GPU availability means more than a binary: CUDA needs a visible `nvidia-smi` device; Vulkan needs Linux, an accessible `/dev/dri/renderD*`, `vulkaninfo`, ICD JSON, and a non-software physical device.
- When auto rejects a built GPU backend, it chooses CPU before transcription begins and logs the reason. Media, model, output, and other Whisper failures remain failures.

A resolved runtime includes backend identity, executable path, build root, capability detail, and device name when safely available. Transcription logs requested backend, resolved backend, executable, and model path.

## Builds

Native builds use `build-cpu`, `build-cuda`, and `build-vulkan`. The current CMake switches are `-DGGML_CUDA=ON` and `-DGGML_VULKAN=ON`. Vulkan builds require upstream’s `libvulkan-dev`, `spirv-headers`, and `glslc`; runtime images use `libvulkan1`, `mesa-vulkan-drivers`, and `vulkan-tools`.

`setup-whisper --backend both` means CPU plus CUDA for existing scripts. `--backend all` builds all three. The pinned upstream source is [`../../docker/whisper.cpp.ref`](../../docker/whisper.cpp.ref); `WHISPER_CPP_REF` is an explicit exact-commit override.

## Models

Models default to `data/models/whisper` natively and `/data/models/whisper` in Compose. `ZENBUKKO_WHISPER_MODEL_DIR` overrides the location. Supported upstream downloads use temporary files, published SHA-1 validation, and atomic rename. A missing, empty, or checksum-mismatched model fails before transcription.

## Diagnostics And Evidence

`zenbukko doctor` is fast and does not load a model. `zenbukko probe-whisper` performs the same bounded backend resolution used at startup. Use a deliberately chosen public or operator-owned input for a real measurement:

```sh
zenbukko benchmark-whisper --input sample.wav --backend cpu --model large-v3-turbo --json
zenbukko benchmark-whisper --input sample.wav --backend vulkan --model large-v3-turbo --json
```

The result reports backend, device when detected, audio duration, wall time, real-time factor, and success or failure. Compare identical input, model, and parameters; do not infer a speedup without measured evidence.

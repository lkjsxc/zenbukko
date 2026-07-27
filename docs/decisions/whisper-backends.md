# Whisper Backend Resolution

## Decision

Zenbukko has one Whisper backend registry and one runtime resolver. Requested values are `auto`, `cpu`, `cuda`, and `vulkan`; concrete runtime values are CPU, CUDA, and Vulkan. A resolved runtime carries backend identity, executable path, build root, and capability evidence.

## Resolution

Explicit CUDA or Vulkan is strict: an absent binary, inaccessible device, missing runtime, or failed quick capability probe is an actionable error. It is never evidence that a media/model/output failure should be retried on CPU.

`auto` considers usable CUDA, then Vulkan, then CPU. A GPU executable alone is insufficient. CUDA checks a visible `nvidia-smi` device. Vulkan checks Linux support, accessible DRM render nodes, `vulkaninfo`, ICD JSON, and a non-software physical device. If auto rejects an included accelerator, it logs why before selecting CPU.

## Rationale

This prevents a binary filename from hiding the actual execution backend, keeps CLI/API/Docker/doctor behavior consistent, and avoids expensive retries that can mask data or configuration errors. It also makes CPU fallback in accelerated images safe only when the operator selected `auto`.

## Build And Model Policy

CPU, CUDA, and Vulkan use the same exact upstream whisper.cpp commit from `docker/whisper.cpp.ref`. Native and Docker builds may override it only through `WHISPER_CPP_REF` with a full commit hash. Models are stored outside the source checkout and supported downloads are checksum-verified atomically.

## Container Boundary

The Vulkan image maps only `/dev/dri`, adds the runtime user to discovered render-device groups, and retains CPU Whisper fallback. NDLOCR-Lite remains CPU-only. Radeon 780M is the primary intended Vulkan target; this decision does not introduce ROCm or an AMD OCR backend.

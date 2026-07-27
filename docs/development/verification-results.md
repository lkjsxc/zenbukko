# Verification Results

## Date

July 27, 2026.

## Local

- `npm ci`: passed (npm reported existing dependency advisories).
- `npm --prefix web-ui ci`: passed (npm reported an existing advisory).
- `npm run type-check`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 88 tests.
- `npm run check:lines`: passed.
- `npm run build`: passed.
- `node dist/index.js doctor`: ran and correctly reported missing local Poppler, NDLOCR-Lite, Whisper build/model, output directory, and `/dev/dri`; exit 1 is expected on this incomplete native host.

## Compose And Images

- `docker compose config`, CPU, CUDA, and Vulkan profile configuration: passed.
- `docker compose --profile cpu build`: passed.
- `docker compose --profile vulkan build`: passed.
- CPU API OCR smoke: passed with synthetic materials.
- Vulkan API image OCR smoke: passed with synthetic materials and CPU NDLOCR-Lite.
- The final Vulkan image contains CPU and Vulkan Whisper executables, `vulkaninfo`, `libvulkan1`, and Mesa `25.2.8-0ubuntu0.24.04.2`.

## Capability Behavior

- In the final Vulkan image without DRM devices, explicit `vulkan` failed clearly: `no DRM render nodes were found under /dev/dri`.
- In the same image with `auto`, the resolver selected CPU and emitted the Vulkan-unavailable warning.
- The host is Ubuntu 24.04 x86_64, kernel `7.0.0-27-generic`, Ryzen 9 9955HX, 32 GiB RAM. It exposes an amdgpu sysfs device but no `/dev/dri` to Docker.
- `vulkaninfo` without a mapped render node found only llvmpipe. This is correctly rejected as acceleration, not Radeon evidence.

## Unverified Host-Dependent Gates

No Radeon 780M container run, unprivileged render-group test, RADV enumeration, real Vulkan Whisper initialization, model download, CPU transcription smoke, CPU-versus-Vulkan benchmark, or CUDA build/runtime test was run. No real model or course media was downloaded or accessed. Run these only on an appropriate GPU host with a selected public/synthetic audio fixture.

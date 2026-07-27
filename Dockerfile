# syntax=docker/dockerfile:1
ARG WHISPER_CPP_REF
ARG NDLOCR_LITE_REF=7c50c338a5324edfb3e441e7b2310878f5e0b494

FROM node:22-bookworm-slim AS app-build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1
COPY package.json package-lock.json* ./
RUN npm ci
COPY web-ui/package.json web-ui/package-lock.json* ./web-ui/
RUN npm --prefix web-ui ci
COPY tsconfig.json ./
COPY src ./src
COPY web-ui ./web-ui
COPY scripts ./scripts
RUN npm run build

FROM ubuntu:24.04 AS whisper-source
ARG WHISPER_CPP_REF
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*
COPY docker/whisper.cpp.ref /tmp/whisper.cpp.ref
RUN ref="${WHISPER_CPP_REF:-$(cat /tmp/whisper.cpp.ref)}" \
 && case "$ref" in *[!0123456789abcdef]*) exit 2 ;; esac \
 && [ "${#ref}" -eq 40 ] \
 && git init /src \
 && git -C /src remote add origin https://github.com/ggml-org/whisper.cpp \
 && git -C /src fetch --depth 1 origin "$ref" \
 && git -C /src checkout --detach FETCH_HEAD

FROM whisper-source AS whisper-cpu
RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake && rm -rf /var/lib/apt/lists/*
RUN cmake -S /src -B /src/build-cpu -DCMAKE_BUILD_TYPE=Release \
 && cmake --build /src/build-cpu --parallel --config Release

FROM whisper-cpu AS whisper-vulkan
RUN apt-get update && apt-get install -y --no-install-recommends libvulkan-dev spirv-headers glslc && rm -rf /var/lib/apt/lists/*
RUN cmake -S /src -B /src/build-vulkan -DCMAKE_BUILD_TYPE=Release -DGGML_VULKAN=ON \
 && cmake --build /src/build-vulkan --parallel --config Release

FROM ubuntu:24.04 AS ndlocr
ARG NDLOCR_LITE_REF
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git g++ python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/ndl-lab/ndlocr-lite /opt/ndlocr-lite \
 && git -C /opt/ndlocr-lite checkout "$NDLOCR_LITE_REF" \
 && python3 -m venv /opt/ndlocr-lite-venv \
 && /opt/ndlocr-lite-venv/bin/pip install --upgrade pip \
 && /opt/ndlocr-lite-venv/bin/pip install /opt/ndlocr-lite \
 && /opt/ndlocr-lite-venv/bin/ndlocr-lite --help >/dev/null \
 && rm -rf /root/.cache/pip

FROM ubuntu:24.04 AS api-base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates curl ffmpeg fonts-liberation gosu poppler-utils python3 libstdc++6 gnupg \
  && install -d -m 0755 /etc/apt/keyrings \
  && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-linux-signing-key.gpg \
  && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update && apt-get install -y --no-install-recommends google-chrome-stable \
  && rm -rf /var/lib/apt/lists/*
COPY --from=app-build /usr/local /usr/local
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
  PATH=/opt/ndlocr-lite-venv/bin:${PATH} \
  ZENBUKKO_NDLOCR_CMD=ndlocr-lite \
  ZENBUKKO_NDLOCR_DEVICE=cpu
COPY --from=app-build /app /app
COPY --from=ndlocr /opt/ndlocr-lite /opt/ndlocr-lite
COPY --from=ndlocr /opt/ndlocr-lite-venv /opt/ndlocr-lite-venv
COPY docker/api-entrypoint.sh docker/ensure-whisper-model.sh /usr/local/bin/
RUN (getent passwd node >/dev/null || useradd -m node) \
 && chmod +x /usr/local/bin/api-entrypoint.sh /usr/local/bin/ensure-whisper-model.sh

FROM api-base AS api-cpu
COPY --from=whisper-cpu /src/build-cpu /app/whisper.cpp/build-cpu
ENTRYPOINT ["api-entrypoint.sh"]

FROM api-base AS api-vulkan
RUN apt-get update && apt-get install -y --no-install-recommends libvulkan1 mesa-vulkan-drivers vulkan-tools && rm -rf /var/lib/apt/lists/*
COPY --from=whisper-cpu /src/build-cpu /app/whisper.cpp/build-cpu
COPY --from=whisper-vulkan /src/build-vulkan /app/whisper.cpp/build-vulkan
ENTRYPOINT ["api-entrypoint.sh"]

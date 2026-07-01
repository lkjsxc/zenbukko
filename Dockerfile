# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

ARG WHISPER_MODEL=large-v3-turbo
ARG NDLOCR_LITE_REF=7c50c338a5324edfb3e441e7b2310878f5e0b494

WORKDIR /app

# System deps for puppeteer (if you ever run auth in-container), ffmpeg for audio extraction,
# and build tools for whisper.cpp.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  curl \
    git \
    python3 \
    python3-venv \
    make \
    g++ \
    cmake \
    pkg-config \
    ffmpeg \
    poppler-utils \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
  && rm -rf /var/lib/apt/lists/*

# Use system chromium instead of puppeteer's download
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Keep whisper.cpp independent from application source layers. Code, docs, and
# test edits should not force the expensive C++ build or model download.
RUN git clone https://github.com/ggerganov/whisper.cpp /app/whisper.cpp \
  && cmake -S /app/whisper.cpp -B /app/whisper.cpp/build-cpu -DCMAKE_BUILD_TYPE=Release \
  && cmake --build /app/whisper.cpp/build-cpu -j --config Release \
  && bash /app/whisper.cpp/models/download-ggml-model.sh "$WHISPER_MODEL"

RUN git clone https://github.com/ndl-lab/ndlocr-lite /opt/ndlocr-lite \
  && git -C /opt/ndlocr-lite checkout "$NDLOCR_LITE_REF" \
  && python3 -m venv /opt/ndlocr-lite-venv \
  && /opt/ndlocr-lite-venv/bin/pip install --upgrade pip \
  && /opt/ndlocr-lite-venv/bin/pip install /opt/ndlocr-lite \
  && rm -rf /root/.cache/pip

ENV PATH="/opt/ndlocr-lite-venv/bin:${PATH}"
ENV ZENBUKKO_NDLOCR_CMD=ndlocr-lite

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY web-ui/package.json web-ui/package-lock.json* ./web-ui/
COPY src ./src
COPY web-ui ./web-ui

RUN npm run build

COPY eslint.config.js ./
COPY scripts ./scripts
COPY tests ./tests
COPY docs ./docs


# Avoid creating root-owned files in bind mounts (e.g. ./new/downloads)
USER node

ENTRYPOINT ["node", "dist/index.js"]

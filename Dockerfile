# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

WORKDIR /app

# System deps for puppeteer (if you ever run auth in-container), ffmpeg for audio extraction,
# and build tools for whisper.cpp.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
  curl \
    git \
    python3 \
    make \
    g++ \
    cmake \
    pkg-config \
    ffmpeg \
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

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Optional: cache whisper.cpp build + base model into image.
# This makes transcription "just work" without running setup-whisper each time.
RUN node dist/index.js setup-whisper --model base

# Avoid creating root-owned files in bind mounts (e.g. ./new/downloads)
USER node

ENTRYPOINT ["node", "dist/index.js"]

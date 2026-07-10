#!/bin/sh
set -eu

session_dir=$(dirname "${ZENBUKKO_SESSION_PATH:-/data/session.json}")
output_dir="${OUTPUT_DIR:-/data/downloads}"
mkdir -p "$session_dir" "$output_dir"

if [ "$(id -u)" = "0" ]; then
  for data_dir in "$session_dir" "$output_dir"; do
    case "$data_dir" in
      /data|/data/*) chown -R node:node "$data_dir" 2>/dev/null || true ;;
    esac
  done
  exec gosu node node dist/index.js "$@"
fi

exec node dist/index.js "$@"

#!/bin/sh
set -eu

session_dir=$(dirname "${ZENBUKKO_SESSION_PATH:-/data/session.json}")
output_dir="${OUTPUT_DIR:-/data/downloads}"
model_dir="${ZENBUKKO_WHISPER_MODEL_DIR:-/data/models/whisper}"
mkdir -p "$session_dir" "$output_dir" "$model_dir"

add_render_groups() {
  for device in /dev/dri/renderD*; do
    [ -c "$device" ] || continue
    gid=$(stat -c '%g' "$device")
    entry=$(getent group "$gid" || true)
    if [ -n "$entry" ]; then group=${entry%%:*}; else group="zenbukko-render-$gid"; groupadd -g "$gid" "$group"; fi
    usermod -a -G "$group" node
  done
}

if [ "$(id -u)" = "0" ]; then
  for data_dir in "$session_dir" "$output_dir" "$model_dir"; do
    case "$data_dir" in /data|/data/*) chown -R node:node "$data_dir" 2>/dev/null || true ;; esac
  done
  add_render_groups
  /usr/local/bin/ensure-whisper-model.sh
  chown -R node:node "$model_dir" 2>/dev/null || true
  case "${ZENBUKKO_WHISPER_BACKEND:-auto}" in
    cuda|vulkan) gosu node node dist/index.js probe-whisper ;;
  esac
  exec gosu node node dist/index.js "$@"
fi

/usr/local/bin/ensure-whisper-model.sh
exec node dist/index.js "$@"

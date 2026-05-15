#!/bin/sh
set -eu

web_data_dir="${ZENBUKKO_WEB_DATA_DIR:-/web-data}"
mkdir -p "$web_data_dir"

if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$web_data_dir" 2>/dev/null || true
  exec gosu node node dist/index.js "$@"
fi

exec node dist/index.js "$@"

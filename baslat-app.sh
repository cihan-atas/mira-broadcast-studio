#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export DISPLAY="${DISPLAY:-:0}"

if [ -f "$SCRIPT_DIR/node_modules/.bin/electron" ]; then
  exec "$SCRIPT_DIR/node_modules/.bin/electron" . "$@"
else
  exec npx electron . "$@"
fi

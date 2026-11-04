#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export DISPLAY="${DISPLAY:-:0}"

if [ -f "$SCRIPT_DIR/node_modules/.bin/electron" ]; then
  exec "$SCRIPT_DIR/node_modules/.bin/electron" . "$@"
elif command -v electron >/dev/null 2>&1; then
  exec electron . "$@"
else
  echo "[BİLGİ] Electron bulunamadı, MİRA Web ve OBS Sunucu modunda başlatılıyor..."
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:8080/" >/dev/null 2>&1 &
  fi
  exec node server.js
fi

#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "======================================================="
echo " 🌸 MLBB 5-HERO KONSEPT YAYIN SUNUCUSU BAŞLATILIYOR"
echo " (Vexana, Zetian, Nana, Carmilla, Atlas)"
echo "======================================================="

node server.js &
SERVER_PID=$!

sleep 1
xdg-open "http://localhost:8080" 2>/dev/null || sensible-browser "http://localhost:8080" 2>/dev/null || true

wait $SERVER_PID

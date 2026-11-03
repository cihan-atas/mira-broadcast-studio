#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================="
echo " ⚡ MİRA BROADCAST STUDIO (Hafif Web Sunucu Modu)"
echo "======================================================="
echo ""

# 1. Node.js kontrolü
if ! command -v node >/dev/null 2>&1; then
  echo "[HATA] Sisteminizde Node.js kurulu değil!"
  echo "Lütfen önce ./kurulum.sh çalıştırın."
  exit 1
fi

# 2. Bağımlılıkların kontrolü
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "[*] İlk çalıştırma tespit edildi. Gerekli paketler kuruluyor..."
  npm install
fi

echo "[*] Yerel yayın sunucusu başlatılıyor (Port: 8080)..."
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:8080/") &
fi

exec node server.js

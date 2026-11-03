#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================="
echo " 🌸 MİRA BROADCAST STUDIO (Linux Native Desktop App)"
echo " (Vexana, Zetian, Nana, Carmilla, Atlas)"
echo "======================================================="
echo ""

# 1. Node.js kontrolü
if ! command -v node >/dev/null 2>&1; then
  echo "[BİLGİ] Sisteminizde Node.js kurulu değil."
  echo "[*] Otomatik kurulum sihirbazı başlatılıyor..."
  echo ""
  exec "$SCRIPT_DIR/kurulum.sh" "$@"
fi

# 2. Bağımlılıkların kontrolü
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "[*] İlk çalıştırma tespit edildi. Gerekli paketler kuruluyor..."
  echo "(Bu işlem internet bağlantınıza bağlı olarak 1-2 dakika sürebilir)"
  echo ""
  npm install
  if [ $? -ne 0 ]; then
    echo "[HATA] Paketler yüklenirken bir sorun oluştu."
    echo "Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
    exit 1
  fi
fi

# 3. Başlat
exec "$SCRIPT_DIR/baslat-app.sh" "$@"

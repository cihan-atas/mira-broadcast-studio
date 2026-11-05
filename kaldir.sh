#!/usr/bin/env bash
# ========================================================
#   🌸 MİRA BROADCAST STUDIO - KALDIRMA (UNINSTALL) SİHİRBAZI
# ========================================================
set -e

echo "========================================================"
echo "  🌸 MİRA BROADCAST STUDIO KALDIRILIYOR..."
echo "========================================================"

# 1. Çalışan süreçleri sonlandır
echo "[*] Çalışan MİRA süreçleri kapatılıyor..."
pkill -f "electron.*mira" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# 2. Kısayolları temizle
echo "[*] Masaüstü ve menü kısayolları kaldırılıyor..."
rm -f "$HOME/Desktop/MİRA Broadcast Studio.desktop"
rm -f "$HOME/Desktop/mira-broadcast-studio.desktop"
rm -f "$HOME/.local/share/applications/mira-broadcast-studio.desktop"

# 3. Kullanıcı yapılandırma ve önbellek dizinlerini temizle
echo "[*] Kullanıcı yapılandırma ve önbellek dizinleri temizleniyor..."
rm -rf "$HOME/.config/MİRA Broadcast Studio"
rm -rf "$HOME/.config/mira-broadcast-studio"
rm -rf "$HOME/.cache/mira-broadcast-studio"

# 4. Debian paket kuruluysa kaldır
if command -v dpkg >/dev/null 2>&1; then
  if dpkg -l | grep -q "mira-broadcast-studio"; then
    echo "[*] mira-broadcast-studio deb paketi kaldırılıyor..."
    sudo apt-get remove -y mira-broadcast-studio 2>/dev/null || true
  fi
fi

echo ""
echo "[✓] MİRA Broadcast Studio sistemden başarıyla kaldırıldı!"

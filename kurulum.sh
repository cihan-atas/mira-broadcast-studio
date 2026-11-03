#!/usr/bin/env bash
# ========================================================
#   🌸 MİRA BROADCAST STUDIO - OTOMATİK KURULUM (LINUX)
# ========================================================
# Bu sihirbaz; Debian, Ubuntu, Mint, Arch, Fedora ve diğer
# tüm Linux dağıtımlarında gerekli tüm bileşenleri (Node.js,
# yayın paketleri, masaüstü simgesi) tek tıkla otomatik kurar.

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Tüm scriptlere çalıştırma izni ver
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

echo "========================================================"
echo "  🌸 MİRA BROADCAST STUDIO - OTOMATİK KURULUM SİHİRBAZI"
echo "========================================================"
echo ""
echo "Bu sihirbaz, temiz/sıfır bir Linux bilgisayarda ihtiyaç duyulan"
echo "tüm bileşenleri (Node.js, yayın paketleri, masaüstü kısayolu)"
echo "hiçbir teknik bilgiye gerek kalmadan tek tıkla kurar."
echo ""

# ---------------------------------------------------------
# 1. ADIM: Node.js ve npm Kontrolü / Otomatik Kurulum
# ---------------------------------------------------------
INSTALL_NODE=0
if ! command -v node >/dev/null 2>&1; then
  INSTALL_NODE=1
elif ! command -v npm >/dev/null 2>&1; then
  INSTALL_NODE=1
fi

if [ "$INSTALL_NODE" -eq 1 ]; then
  echo "[!] Sisteminizde Node.js veya npm kurulu bulunamadı."
  echo "[*] Dağıtımınız tespit ediliyor ve Node.js LTS kuruluyor..."
  echo ""

  SUDO=""
  if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
      SUDO="sudo"
    fi
  fi

  # Debian / Ubuntu / Linux Mint / Pop!_OS
  if command -v apt-get >/dev/null 2>&1; then
    echo "[1/3] Debian/Ubuntu tabanlı sistem tespit edildi (apt)..."
    $SUDO apt-get update -qq || true
    $SUDO apt-get install -y nodejs npm curl || true
  # Arch Linux / Manjaro / EndeavourOS
  elif command -v pacman >/dev/null 2>&1; then
    echo "[1/3] Arch Linux tabanlı sistem tespit edildi (pacman)..."
    $SUDO pacman -Sy --noconfirm nodejs npm || true
  # Fedora / RHEL / CentOS
  elif command -v dnf >/dev/null 2>&1; then
    echo "[1/3] Fedora tabanlı sistem tespit edildi (dnf)..."
    $SUDO dnf install -y nodejs npm || true
  # openSUSE
  elif command -v zypper >/dev/null 2>&1; then
    echo "[1/3] openSUSE tabanlı sistem tespit edildi (zypper)..."
    $SUDO zypper --non-interactive install nodejs npm || true
  fi

  # Hala bulunamadıysa kullanıcı dizinine resmi Node.js LTS static binary indir
  if ! command -v node >/dev/null 2>&1; then
    echo "[*] Yerel Node.js LTS binary paketi indiriliyor (~/.local/node)..."
    mkdir -p "$HOME/.local"
    NODE_TAR="$HOME/.local/node-lts.tar.xz"
    curl -fsSL https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz -o "$NODE_TAR"
    tar -xf "$NODE_TAR" -C "$HOME/.local"
    rm -f "$NODE_TAR"
    EXTRACTED_DIR=$(find "$HOME/.local" -maxdepth 1 -type d -name "node-v20*" | head -n 1)
    if [ -n "$EXTRACTED_DIR" ]; then
      export PATH="$EXTRACTED_DIR/bin:$PATH"
      echo "export PATH=\"$EXTRACTED_DIR/bin:\$PATH\"" >> "$HOME/.bashrc"
      echo "export PATH=\"$EXTRACTED_DIR/bin:\$PATH\"" >> "$HOME/.profile" 2>/dev/null || true
    fi
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "[HATA] Node.js otomatik kurulamadı. Lütfen paket yöneticinizden Node.js LTS sürümünü kurun."
    exit 1
  fi
  echo "[✓] Node.js başarıyla kuruldu: $(node -v)"
else
  echo "[✓] Node.js sisteminizde zaten kurulu: $(node -v)"
fi

echo ""

# ---------------------------------------------------------
# 2. ADIM: Paket Bağımlılıklarının Kurulumu (npm install)
# ---------------------------------------------------------
if [ ! -d "node_modules" ]; then
  echo "[*] İlk çalıştırma tespit edildi. Gerekli yayın paketleri kuruluyor..."
  echo "(Bu işlem internet bağlantınıza bağlı olarak 1-2 dakika sürebilir)"
  echo ""
  npm install
  echo "[✓] Tüm yayın paketleri başarıyla kuruldu!"
  echo ""
fi

# ---------------------------------------------------------
# 3. ADIM: Masaüstü Kısayolu ve Menü Entegrasyonu (.desktop)
# ---------------------------------------------------------
ICON_PATH="$SCRIPT_DIR/assets/icon.png"
EXEC_PATH="$SCRIPT_DIR/baslat.sh"

DESKTOP_ENTRY="[Desktop Entry]
Version=1.0
Type=Application
Name=MİRA Broadcast Studio
GenericName=Stream Deck & Broadcast Studio
Comment=Profesyonel MLBB, Kick ve TikTok Canlı Yayın Masası
Exec=\"$EXEC_PATH\" %U
Icon=$ICON_PATH
Path=$SCRIPT_DIR
Terminal=false
Categories=AudioVideo;AudioVideoEditing;Recorder;
Keywords=stream;deck;obs;kick;tiktok;mlbb;mira;
StartupWMClass=mira-broadcast-studio
"

# 1. Uygulama Menüsü (GNOME Dash / KDE Kickoff / Rofi / vb.)
APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"
echo "$DESKTOP_ENTRY" > "$APPS_DIR/mira-broadcast-studio.desktop"
chmod +x "$APPS_DIR/mira-broadcast-studio.desktop"

# 2. Kullanıcı Masaüstü (Desktop)
DESKTOP_DIR="$HOME/Desktop"
if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP)"
fi

if [ -d "$DESKTOP_DIR" ]; then
  DESK_FILE="$DESKTOP_DIR/MİRA Broadcast Studio.desktop"
  echo "$DESKTOP_ENTRY" > "$DESK_FILE"
  chmod +x "$DESK_FILE"
  # GNOME / KDE / XFCE üzerinde güvenli işaretle
  if command -v gio >/dev/null 2>&1; then
    gio set "$DESK_FILE" metadata::trusted true 2>/dev/null || true
  fi
  echo "[✓] Masaüstü ve başlat menüsü kısayolu eklendi!"
fi

echo ""
echo "========================================================"
echo "  🌸 MİRA Broadcast Studio Başlatılıyor..."
echo "========================================================"
echo ""

exec "$SCRIPT_DIR/baslat.sh" "$@"

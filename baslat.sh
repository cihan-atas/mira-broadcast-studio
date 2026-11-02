#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================="
echo " 🌸 MİRA BROADCAST STUDIO (Linux Native Desktop App)"
echo " (Vexana, Zetian, Nana, Carmilla, Atlas)"
echo "======================================================="

exec "$SCRIPT_DIR/baslat-app.sh" "$@"

@echo off
title MIRA BROADCAST STUDIO
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo  MIRA BROADCAST STUDIO - Professional Stream Deck (Win)
echo ========================================================
echo.

:: 1. Ilk calistirmada node_modules yoksa bagimliliklari otomatik kur
if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma tespit edildi, bagimliliklar yukleniyor...
    call npm install --omit=dev
)

:: 2. Electron App Baslatma (Tarayici yok, %%100 Masaustu App)
if exist "node_modules\.bin\electron.cmd" (
    start "" "node_modules\.bin\electron.cmd" . %*
) else (
    where electron >nul 2>nul
    if %errorlevel% equ 0 (
        start "" electron . %*
    ) else (
        start "" npx electron . %*
    )
)
exit

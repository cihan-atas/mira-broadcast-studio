@echo off
title MIRA BROADCAST STUDIO
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo  MİRA BROADCAST STUDIO - Professional Stream Deck (Win)
echo ========================================================
echo.

:: 1. Node.js Kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sisteminizde kurulu bulunamadi!
    echo Lutfen https://nodejs.org adresinden kurun.
    pause
    exit /b 1
)

:: 2. Ilk calistirmada node_modules yoksa bagimliliklari otomatik kur
if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma tespit edildi, bagimliliklar yukleniyor...
    call npm install
)

:: 3. Electron App Baslatma
if exist "node_modules\.bin\electron.cmd" (
    echo [BILGI] MİRA Masaustu uygulamasi baslatiliyor...
    start "" "node_modules\.bin\electron.cmd" . %*
    exit
)

where electron >nul 2>nul
if %errorlevel% equ 0 (
    echo [BILGI] Sistem Electron uygulamasi baslatiliyor...
    start "" electron . %*
    exit
)

:: 4. Electron yoksa Web & Tarayici Modunda Baslat (Fallback)
echo [BILGI] Electron bulunamadi, MİRA Web ve OBS Sunucu modunda baslatiliyor...
start "" "http://localhost:8080/"
node server.js

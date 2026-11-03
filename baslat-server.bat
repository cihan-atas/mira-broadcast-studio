@echo off
title MIRA BROADCAST STUDIO - Web & OBS Server
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo  MİRA BROADCAST STUDIO - Web & OBS Sunucu Modu (Win)
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sisteminizde kurulu bulunamadi!
    echo Lutfen https://nodejs.org adresinden kurun.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [BILGI] Ilk calistirma tespit edildi, bagimliliklar yukleniyor...
    call npm install
)

echo.
echo [BILGI] MİRA Sunucusu baslatiliyor: http://localhost:8080/
start "" "http://localhost:8080/"
node server.js
pause

@echo off
title MLBB 5-Hero Konsept Yayin Sunucusu (Port: 8080 / 8081)
chcp 65001 >nul
cd /d "%~dp0"

echo =======================================================
echo   🌸 MLBB 5-HERO KONSEPT YAYIN SUNUCUSU
echo   (Vexana, Zetian, Nana, Carmilla, Atlas)
echo =======================================================
echo.
echo Windows PowerShell uzerinden yerel sunucu baslatiliyor...
echo (Node.js veya Python kurulumu GEREKTIRMEZ!)
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [UYARI] PowerShell sunucusu dogrudan calistirilmadi, alternatif deneniyor...
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        node server.js
        goto end
    )
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        python -m http.server 8080
        goto end
    )
    start index.html
)

:end
pause

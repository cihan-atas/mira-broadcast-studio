@echo off
title MIRA BROADCAST STUDIO
chcp 65001 >nul
cd /d "%~dp0"

echo =======================================================
echo   🌸 MİRA BROADCAST STUDIO (Windows Native Desktop App)
echo   (Vexana, Zetian, Nana, Carmilla, Atlas)
echo =======================================================
echo.

call "%~dp0baslat-app.bat" %*
exit /b

@echo off
title MIRA Broadcast Studio - Kaldir (Uninstall)
echo ========================================================
echo   MIRA BROADCAST STUDIO KALDIRILIYOR...
echo ========================================================
echo.

echo [*] Calisan surecler sonlandiriliyor...
taskkill /F /IM "electron.exe" /FI "WINDOWTITLE eq MIRA*" >nul 2>&1
taskkill /F /IM "node.exe" /FI "WINDOWTITLE eq MIRA*" >nul 2>&1

echo [*] Masaustu ve baslat menusu kisayollari kaldiriliyor...
del /f /q "%USERPROFILE%\Desktop\MIRA Broadcast Studio.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\MİRA Broadcast Studio.lnk" >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\MIRA Broadcast Studio.lnk" >nul 2>&1
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\MİRA Broadcast Studio.lnk" >nul 2>&1

echo [*] Kullanici verileri temizleniyor...
rd /s /q "%APPDATA%\MİRA Broadcast Studio" >nul 2>&1
rd /s /q "%APPDATA%\mira-broadcast-studio" >nul 2>&1

echo.
echo [OK] MIRA Broadcast Studio basariyla kaldirildi!
pause

@echo off
title MIRA BROADCAST STUDIO
chcp 65001 >nul
cd /d "%~dp0"

echo =======================================================
echo   🌸 MİRA BROADCAST STUDIO (Professional Stream Deck)
echo   (Vexana, Zetian, Nana, Carmilla, Atlas)
echo =======================================================
echo.

:: 1. Node.js kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [BILGI] Sisteminizde Node.js kurulu degil.
    echo [*] Otomatik kurulum sihirbazi baslatiliyor...
    echo.
    call "%~dp0kurulum.bat"
    exit /b
)

:: 2. Bagimliliklarin kontrolü
if not exist "node_modules\" (
    echo [*] Ilk calistirma tespit edildi. Gerekli paketler kuruluyor...
    echo (Bu islem internet baglantiniza bagli olarak 1-2 dakika surebilir)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] Paketler yuklenirken bir sorun olustu.
        echo Lutfen internet baglantinizi kontrol edip tekrar deneyin.
        pause
        exit /b 1
    )
)

:: 3. Calistir
call "%~dp0baslat-app.bat" %*
exit /b

@echo off
title MIRA BROADCAST STUDIO - Otomatik Kurulum ve Baslatici
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo   🌸 MİRA BROADCAST STUDIO - OTOMATİK KURULUM (WINDOWS)
echo ========================================================
echo.
echo Bu sihirbaz, temiz/sifir bir Windows bilgisayarda ihtiyac duyulan
echo tum bilesenleri (Node.js, yayin paketleri, masaustu kisayolu)
echo hicbir teknik bilgiye gerek kalmadan tek tikla kurar.
echo.

:: ---------------------------------------------------------
:: 1. ADIM: Node.js Kontrolü ve Gerekirse Otomatik Kurulum
:: ---------------------------------------------------------
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [✓] Node.js sisteminizde zaten kurulu.
    goto :CHECK_DEPENDENCIES
)

echo [!] Sisteminizde Node.js kurulu bulunamadi.
echo [*] MİRA Broadcast Studio icin resmi Node.js LTS otomatik kuruluyor...
echo.

:: A. Once modern Windows 10/11 Paket Yoneticisi (winget) dene
where winget >nul 2>nul
if %errorlevel% equ 0 (
    echo [1/3] Windows Package Manager (winget) ile Node.js LTS kuruluyor...
    winget install OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% equ 0 goto :REFRESH_PATH
)

:: B. Winget yoksa PowerShell ile resmi MSI indir ve kur
echo [1/3] Resmi Node.js LTS yukleyicisi indiriliyor...
set "NODE_MSI=%TEMP%\node_lts_installer.msi"
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object System.Net.WebClient; $wc.DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '%NODE_MSI%')"

if exist "%NODE_MSI%" (
    echo [2/3] Node.js LTS sessizce kuruluyor, lutfen bekleyin...
    msiexec /i "%NODE_MSI%" /passive /norestart
    del /f /q "%NODE_MSI%" >nul 2>nul
) else (
    echo [HATA] Node.js otomatik indirilemedi. Lutfen internet baglantinizi kontrol edin.
    echo Veya manuel olarak https://nodejs.org adresinden kurun.
    pause
    exit /b 1
)

:REFRESH_PATH
:: Bilgisayari yeniden baslatmaya gerek kalmadan oturum PATH degiskenini guncelle
if exist "%ProgramFiles%\nodejs" (
    set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
)
if exist "%ProgramFiles(x86)%\nodejs" (
    set "PATH=%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [BILGI] Node.js kurulumu tamamlandi!
    echo Sistem ortam degiskenlerinin yenilenmesi icin lutfen bu pencereyi kapatin
    echo ve 'baslat.bat' dosyasina tekrar cift tiklayin.
    echo.
    pause
    exit /b 0
)

echo [✓] Node.js basariyla kuruldu ve aktif edildi!
echo.

:: ---------------------------------------------------------
:: 1.5. ADIM: FFmpeg Kontrolü (Ses Perde & Efekt Desteği)
:: ---------------------------------------------------------
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Ses perde & donusturme motoru icin FFmpeg kontrol ediliyor...
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        echo [*] FFmpeg (Gyan.FFmpeg) winget ile sessizce yukleniyor...
        winget install Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements >nul 2>nul
    )
)

:: ---------------------------------------------------------
:: 2. ADIM: Paket Bagimliliklarinin Kurulumu (npm install)
:: ---------------------------------------------------------
:CHECK_DEPENDENCIES
if not exist "node_modules\" (
    echo [*] Ilk calistirma tespit edildi. Gerekli yayin paketleri kuruluyor...
    echo (Bu islem internet baglantiniza bagli olarak 1-2 dakika surebilir)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] Paketler kurulurken bir sorun olustu.
        echo Lutfen internet baglantinizi kontrol edip tekrar deneyin.
        pause
        exit /b 1
    )
    echo [✓] Tum yayin paketleri basariyla kuruldu!
    echo.
)

:: ---------------------------------------------------------
:: 3. ADIM: Masaustu Kısayolu Olusturma (Desktop Shortcut)
:: ---------------------------------------------------------
set "DESKTOP_LNK=%USERPROFILE%\Desktop\MIRA Broadcast Studio.lnk"
if not exist "%DESKTOP_LNK%" (
    echo [*] Masaustunuze MİRA Broadcast Studio kisayolu olusturuluyor...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_LNK%'); $s.TargetPath = '%~dp0baslat.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0assets\icon.ico'; $s.Save()" >nul 2>nul
    if exist "%DESKTOP_LNK%" (
        echo [✓] Masaustu kisayolu basariyla eklendi!
    )
)

:: ---------------------------------------------------------
:: 4. ADIM: MİRA Stüdyoyu Başlat
:: ---------------------------------------------------------
echo.
echo ========================================================
echo   🌸 MİRA Broadcast Studio Baslatiliyor...
echo ========================================================
call "%~dp0baslat-app.bat" %*
exit /b

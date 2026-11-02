<#
    .SYNOPSIS
    MLBB 5-Hero Konsept Yayin Sunucusu (Pure PowerShell - Node/Python GEREKTIRMEZ)
#>

param (
    [int]$Port = 8080
)

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$rootDir = $PSScriptRoot
if (-not $rootDir) {
    $rootDir = (Get-Location).Path
}

$global:eventList = [System.Collections.ArrayList]::new()

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".wav"  = "audio/wav"
    ".mp3"  = "audio/mpeg"
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[UYARI] Port $Port mesgul. Alternatif Port 8081 deneniyor..." -ForegroundColor Yellow
    $Port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:8081/")
    try {
        $listener.Start()
    } catch {
        Write-Host "[HATA] Port acilamadi: $($_.Exception.Message)" -ForegroundColor Red
        Exit 1
    }
}

Write-Host "=======================================================" -ForegroundColor Magenta
Write-Host " 🌸 MLBB 5-HERO KONSEPT POWERSHELL YAYIN SUNUCUSU" -ForegroundColor Magenta
Write-Host " (Node.js veya Python kurulumu GEREKTİRMEZ!)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Magenta
Write-Host " 🎛️ Kontrol Masasi:  http://localhost:$Port" -ForegroundColor Yellow
Write-Host " --- 🟢 KICK YAYIN SAHNELERİ ---" -ForegroundColor Green
Write-Host " 💀 Vexana (Kick):   http://localhost:$Port/kick/vexana/in-game.html" -ForegroundColor Yellow
Write-Host " 👑 Zetian (Kick):   http://localhost:$Port/kick/zetian/in-game.html" -ForegroundColor Yellow
Write-Host " 🐾 Nana (Kick):     http://localhost:$Port/kick/nana/in-game.html" -ForegroundColor Yellow
Write-Host " 🩸 Carmilla (Kick): http://localhost:$Port/kick/carmilla/in-game.html" -ForegroundColor Yellow
Write-Host " ⚓ Atlas (Kick):    http://localhost:$Port/kick/atlas/in-game.html" -ForegroundColor Yellow
Write-Host " --- 📱 TIKTOK LIVE SAHNELERİ ---" -ForegroundColor Cyan
Write-Host " 💀 Vexana (TikTok): http://localhost:$Port/tiktok/vexana/in-game.html" -ForegroundColor Yellow
Write-Host " 👑 Zetian (TikTok): http://localhost:$Port/tiktok/zetian/in-game.html" -ForegroundColor Yellow
Write-Host " 🐾 Nana (TikTok):   http://localhost:$Port/tiktok/nana/in-game.html" -ForegroundColor Yellow
Write-Host " 🩸 Carmilla (TikTok): http://localhost:$Port/tiktok/carmilla/in-game.html" -ForegroundColor Yellow
Write-Host " ⚓ Atlas (TikTok):  http://localhost:$Port/tiktok/atlas/in-game.html" -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Magenta
Write-Host "Kapatmak icin CTRL+C tuslarina basin.`n" -ForegroundColor Gray

try {
    Start-Process "http://localhost:$Port"
} catch {}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $rawPath = $request.Url.LocalPath
        if ($rawPath -eq "/") { $rawPath = "/index.html" }

        # API: Test Alert Al & Kuyruga Ekle
        if ($rawPath -eq "/api/test-alert" -and $request.HttpMethod -eq "POST") {
            try {
                $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd()
                $json = ConvertFrom-Json $body

                $nowTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                $eventItem = @{
                    id = [Guid]::NewGuid().ToString()
                    time = $nowTime
                    type = $json.type
                    alertType = $json.alertType
                    payload = $json.payload
                    goal = $json.goal
                    username = $json.username
                    content = $json.content
                }

                [void]$global:eventList.Add($eventItem)
                if ($global:eventList.Count -gt 60) {
                    [void]$global:eventList.RemoveAt(0)
                }

                $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                $response.ContentType = "application/json"
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } catch {
                $response.StatusCode = 400
            }
            $response.Close()
            continue
        }

        # API: Olaylari Dagit (Polling)
        if ($rawPath -eq "/api/poll") {
            $since = [int64]0
            if ($request.QueryString["since"]) {
                [int64]::TryParse($request.QueryString["since"], [ref]$since)
            }

            $matching = @($global:eventList | Where-Object { $_.time -gt $since })
            $resultObj = @{ events = $matching }
            $jsonStr = ConvertTo-Json $resultObj -Compress -Depth 4
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)

            $response.ContentType = "application/json"
            $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $response.Close()
            continue
        }

        # API: Now Playing / Muzik Senkronizasyonu
        if ($rawPath -eq "/api/now-playing") {
            $txtPath = [System.IO.Path]::Combine($rootDir, "now-playing.txt")
            if ($request.HttpMethod -eq "GET") {
                $songTitle = "♪ MLBB Arena - Necrokeep Lo-Fi Chill Beats"
                if (Test-Path $txtPath) {
                    try {
                        $txtVal = [System.IO.File]::ReadAllText($txtPath, [System.Text.Encoding]::UTF8).Trim()
                        if ($txtVal) { $songTitle = $txtVal }
                    } catch {}
                }
                $jsonStr = ConvertTo-Json @{ title = $songTitle } -Compress
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
                $response.ContentType = "application/json"
                $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            } elseif ($request.HttpMethod -eq "POST") {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $body = $reader.ReadToEnd()
                    $json = ConvertFrom-Json $body
                    if ($json.title) {
                        [System.IO.File]::WriteAllText($txtPath, $json.title, [System.Text.Encoding]::UTF8)
                        $global:eventList.Add(@{
                            id = [Guid]::NewGuid().ToString()
                            time = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            type = "UPDATE_SONG"
                            title = $json.title
                        })
                    }
                    $respBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                    $response.ContentType = "application/json"
                    $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                } catch {
                    $response.StatusCode = 400
                }
            }
            $response.Close()
            continue
        }

        # Statik Dosya Sunumu
        $decodedPath = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
        $localFilePath = [System.IO.Path]::Combine($rootDir, $decodedPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if (Test-Path $localFilePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $response.ContentType = $mime
            try {
                $fileBytes = [System.IO.File]::ReadAllBytes($localFilePath)
                $response.ContentLength64 = $fileBytes.Length
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            } catch {}
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("Dosya bulunamadi: $rawPath")
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}

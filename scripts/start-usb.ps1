<#
Runs Expo over a USB cable instead of Wi-Fi/LAN/tunnel.

What it does:
  1. Checks a device is connected and authorized via adb.
  2. adb-reverses the Metro port (8081) and backend API port (5007) so the
     phone's "localhost" traffic is tunneled to this PC over the cable.
  3. Points the frontend at http://localhost:5007 via an EXPO_PUBLIC_API_URL
     environment variable set only for this process — never written to disk,
     so it can't linger and silently override .env in unrelated Expo sessions
     (that used to happen when this script wrote it to .env.local).
  4. Starts Expo with --localhost so the QR code / dev menu use localhost
     instead of the PC's LAN IP.

Requires the backend to already be running separately (npm run dev in
Vendor_management_backend) and USB debugging enabled + authorized on the phone.
#>

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RepoRoot "Vendor_management_frontend"
$MetroPort = 8081
$BackendPort = 5007

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Error "adb not found on PATH. Install Android platform-tools (or Android Studio) and add it to PATH."
    exit 1
}

$deviceLines = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\S' }
$authorized = $deviceLines | Where-Object { ($_ -split '\s+')[1] -eq 'device' }
$unauthorized = $deviceLines | Where-Object { ($_ -split '\s+')[1] -eq 'unauthorized' }

if (-not $authorized) {
    if ($unauthorized) {
        Write-Error "Phone is connected but not authorized. Check the phone screen for an 'Allow USB debugging?' prompt and accept it, then re-run this script."
    } else {
        Write-Error "No USB-connected Android device found. Plug in your phone, enable USB debugging (Settings > Developer options), and re-run this script."
    }
    exit 1
}

Write-Host "USB device(s) authorized:" -ForegroundColor Green
$authorized | ForEach-Object { Write-Host "  $_" }

Write-Host "Forwarding ports over USB (adb reverse)..." -ForegroundColor Cyan
adb reverse "tcp:$MetroPort" "tcp:$MetroPort"
adb reverse "tcp:$BackendPort" "tcp:$BackendPort"

Write-Host "API calls will go over USB to localhost:$BackendPort (this session only)" -ForegroundColor Cyan
Write-Host "(Make sure the backend is running: npm run dev in Vendor_management_backend)" -ForegroundColor Yellow

Write-Host "Starting Expo on localhost. Scan the QR in Expo Go - it will connect over USB, not Wi-Fi." -ForegroundColor Green
Push-Location $FrontendDir
try {
    # Windows/Node often resolves "localhost" to the IPv6 loopback (::1) first, which
    # makes Metro bind to ::1 only. adb reverse forwards through IPv4 (127.0.0.1), so
    # without this the phone gets "unexpected end of stream" on every request.
    $env:NODE_OPTIONS = "--dns-result-order=ipv4first"
    $env:EXPO_PUBLIC_API_URL = "http://localhost:$BackendPort/api/v1"
    npx expo start --localhost
} finally {
    Remove-Item Env:\NODE_OPTIONS -ErrorAction SilentlyContinue
    Remove-Item Env:\EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue
    Pop-Location
}

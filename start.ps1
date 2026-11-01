# ========================================================
# AquaGuard: Local One-Click Startup Script
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   AquaGuard: Smart Water Quality Monitoring System" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$pyPath = "$env:LOCALAPPDATA\Programs\python311\python.exe"
$nodePath = "$env:LOCALAPPDATA\Programs\node"
$env:Path = "$nodePath;$env:LOCALAPPDATA\Programs\python311\Scripts;$env:LOCALAPPDATA\Programs\python311;$env:Path"

# Check Python
if (!(Test-Path $pyPath)) {
    $pyPath = "python"
}

Write-Host "[1/3] Checking and seeding database..." -ForegroundColor Yellow
& $pyPath backend\seed.py

Write-Host "[2/3] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Yellow
$backendJob = Start-Process -FilePath $pyPath -ArgumentList "-m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload" -PassThru

Start-Sleep -Seconds 2

Write-Host "[3/3] Starting React Dashboard on http://localhost:5173..." -ForegroundColor Yellow
Set-Location frontend
$frontendJob = Start-Process -FilePath "$nodePath\npm.cmd" -ArgumentList "run dev" -PassThru

Write-Host "`nAquaGuard Platform is now LIVE!" -ForegroundColor Green
Write-Host "  - Frontend UI:  http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  - Default Admin: admin@aquaguard.io / admin123" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop servers when done." -ForegroundColor Gray

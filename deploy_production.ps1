# Industrial AI Copilot — Production Deployment Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " INDUSTRIAL AI COPILOT — FULL-STACK DEPLOYMENT" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Step 1: Build Frontend
Write-Host "[1/3] Building Production React Frontend..." -ForegroundColor Yellow
Set-Location "$ScriptDir/frontend"
npm run build
Set-Location $ScriptDir

# Step 2: Pytest
Write-Host ""
Write-Host "[2/3] Running Backend Verification Tests..." -ForegroundColor Yellow
python -m pytest backend/tests -v

# Step 3: Launch Production Server
Write-Host ""
Write-Host "[3/3] Launching Unified Full-Stack Server on Port 8001..." -ForegroundColor Green
Write-Host "Serving React 19 Frontend + 15 REST Endpoints on: http://127.0.0.1:8001" -ForegroundColor Cyan

Start-Process "http://127.0.0.1:8001"

Set-Location "$ScriptDir/backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

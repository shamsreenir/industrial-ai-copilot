@echo off
title Industrial AI Copilot - Production Deployment
echo ===================================================
echo INDUSTRIAL AI COPILOT - PRODUCTION DEPLOYMENT
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Building Production React Frontend...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [2/3] Verifying Backend Unit Tests...
python -m pytest backend/tests -v
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend tests failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Launching Unified Production Server on Port 8001...
echo Serving both React frontend and FastAPI REST endpoints on:
echo   http://127.0.0.1:8001
echo   http://localhost:8001
echo.
start http://127.0.0.1:8001

cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

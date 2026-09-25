@echo off
title SETU Dev Launcher
echo ============================================================
echo   SETU (Setu) — SIH26186 Development Launcher
echo   Team: Guardian Minds | MHA CAPF Platform
echo ============================================================
echo.

echo [1/2] Starting FastAPI Backend on port 8000...
start "SETU Backend - FastAPI (Port 8000)" cmd /k "cd /d %~dp0backend && python main.py"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Vite Frontend on port 5173...
start "SETU Frontend - Vite (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo Dev services launched in separate windows:
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000
echo - Swagger:  http://localhost:8000/docs
echo.
echo Check the two opened windows for live logs or any error messages.
echo ============================================================
echo.
pause

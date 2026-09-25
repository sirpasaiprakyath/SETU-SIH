@echo off
title SETU Frontend - Vite
echo ============================================================
echo   Starting SETU Frontend (Vite on Port 5173)
echo ============================================================
cd /d "%~dp0frontend"
npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend failed to start.
    echo Try running: npm install
    echo.
)
pause

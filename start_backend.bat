@echo off
title SETU Backend - FastAPI
echo ============================================================
echo   Starting SETU Backend (FastAPI on Port 8000)
echo ============================================================
cd /d "%~dp0backend"
python main.py
if errorlevel 1 (
    echo.
    echo [ERROR] Backend crashed or dependencies are missing.
    echo Try running: pip install -r requirements.txt
    echo.
)
pause

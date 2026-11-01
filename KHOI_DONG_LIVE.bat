@echo off
title Cozy Cinema Live Starter
cls
echo ========================================================
echo   COZY CINEMA LIVE - STARTING SERVER...
echo ========================================================
echo.

cd /d "%~dp0"

start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/control.html && start http://localhost:3000/overlay.html"

if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" server.js
) else (
    node server.js
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Khong the khoi dong server.
    pause
)

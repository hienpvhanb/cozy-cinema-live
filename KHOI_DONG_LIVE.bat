@echo off
title 🎬 Cozy Cinema Live - Starter
chcp 65001 >nul

echo ========================================================
echo   🎬 ĐANG KHỞI ĐỘNG COZY CINEMA LIVE...
echo ========================================================
echo.

cd /d "%~dp0"

:: Mở sẵn Bảng điều khiển và Màn hình Overlay trên trình duyệt sau 2 giây
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/control.html && start http://localhost:3000/overlay.html"

:: Khởi chạy máy chủ Node.js
node server.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Có lỗi xảy ra khi chạy máy chủ.
    pause
)

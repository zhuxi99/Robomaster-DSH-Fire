@echo off
chcp 65001 >nul
title RoboMaster DSH 安装
echo ============================================
echo   RoboMaster DSH Desktop 一键安装
echo   正在启动安装脚本...
echo ============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
if %errorlevel% neq 0 (
    echo [错误] 安装脚本执行失败，退出码 %errorlevel%
    echo 请检查屏幕上的红色错误信息
) else (
    echo [完成] 安装成功，请重启 DSH Desktop
)
echo.
pause
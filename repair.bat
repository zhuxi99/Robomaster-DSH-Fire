@echo off
chcp 65001 >nul
title RoboMaster DSH - 修复 settings.yaml
echo ============================================
echo   RoboMaster DSH - 配置修复工具
echo   只补回损坏的字段，不动你已填好的密钥
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] 未找到 Node.js，请先安装 Node 22+ : https://nodejs.org/
    echo.
    pause
    exit /b 1
)

node "%~dp0repair-settings.mjs"
set RC=%errorlevel%
echo.
if %RC% equ 0 (
    echo [DONE] 配置已就绪，重启 DSH Desktop 即可。
) else (
    echo [ERROR] 修复未完成，退出码 %RC%
    echo 若仍无法启动，可双击 install.bat 重置为干净模板。
)
echo.
pause

@echo off
title RoboMaster DSH Desktop Installer
echo ============================================
echo   RoboMaster DSH Desktop
echo     Starting installer...
echo ============================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
if %errorlevel% neq 0 (
    echo [ERROR] Installer failed with exit code %errorlevel%
    echo Check the PowerShell error messages above.
) else (
    echo [DONE] Installation completed. Restart DSH Desktop.
)
echo.
pause

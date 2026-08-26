@echo off
chcp 65001 >nul
title RoboMaster DSH - 整合包自检
echo ============================================
echo   RoboMaster DSH 整合包自检（只读，不改文件）
echo ============================================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未找到 node，部分检查会跳过
    echo.
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose.ps1"
echo.
echo 把上面整段输出发回排查即可（也已保存到 %%USERPROFILE%%\.dsh\pack-diagnose.txt）
echo.
pause

@echo off
chcp 65001 > nul
title 🖥️ Kompyuter Holatini Monitoring Qilish & Dars Simulyatori

echo ======================================================================
echo    🖥️ KOMPYUTER HOLATINI MONITORING QILISH VA DARSLIK SIMULYATOR
echo ======================================================================
echo.

cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    set "PY_EXE=.venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

echo [*] Server ishga tushirilmoqda...
echo [*] Veb-panel manzili: http://localhost:8080
echo [*] Brauzer avtomatik tarzda ochiladi...
echo.

start "" "http://localhost:8080"
"%PY_EXE%" app.py

pause

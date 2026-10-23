@echo off
chcp 65001 > nul
title 🖥️ Terminal Monitoring Paneli (CLI)

cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    set "PY_EXE=.venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

"%PY_EXE%" monitor_cli.py
pause

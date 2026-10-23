@echo off
setlocal
echo Starting Spark Log Analyzer Web UI Dashboard...
powershell -ExecutionPolicy Bypass -File "%~dp0run.ps1" -Mode ui
endlocal

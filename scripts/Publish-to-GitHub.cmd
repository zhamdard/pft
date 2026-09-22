@echo off
REM ============================================================
REM  Double-click this file to put PFT online.
REM  It opens a PowerShell window that signs you in to GitHub,
REM  creates the repository, and publishes the app.
REM ============================================================
title PFT - Publish to GitHub

echo.
echo   Starting the GitHub publisher...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-to-github.ps1"

echo.
echo   ------------------------------------------------
echo   Finished. You can close this window.
echo   ------------------------------------------------
echo.
pause

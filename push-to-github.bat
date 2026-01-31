@echo off
title Push to GitHub
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Pushing to GitHub...
echo.
git push -u origin main
echo.
if errorlevel 1 (
  echo If the repo does not exist yet, create it at:
  echo   https://github.com/new
  echo   Name: forever-faded-platform
  echo   Then run this script again.
)
pause

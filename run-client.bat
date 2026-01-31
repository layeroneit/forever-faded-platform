@echo off
title Forever Faded - Web App
cd /d "%~dp0client"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist "node_modules" (
  echo Installing client dependencies...
  npm install
  if errorlevel 1 exit /b 1
)
echo.
echo Starting app at http://localhost:3000
echo.
npm run dev
pause

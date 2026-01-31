@echo off
title Forever Faded - API
cd /d "%~dp0server"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist "node_modules" (
  echo Installing server dependencies...
  npm install
  if errorlevel 1 exit /b 1
)
echo Setting up database...
call npx prisma generate
call npx prisma db push
call npx prisma db seed
echo.
echo Starting API at http://localhost:3001
echo.
npm run dev
pause

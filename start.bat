@echo off
rem Start Synora and open it in your browser.
rem
rem Press Ctrl+C (or close this window) to stop the server.

setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Synora needs Node.js 22.22 or newer: https://nodejs.org
  pause
  exit /b 1
)
node -e "const [a, b] = process.versions.node.split('.').map(Number); process.exit(a > 22 || (a === 22 && b >= 22) ? 0 : 1)"
if errorlevel 1 echo Warning: your Node.js is older than 22.22, which React Router 8 needs.

if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
rem The MySQL API runs in its own window once it is set up (see database\README.md).
if exist server\.env (
  start "Synora API" cmd /c npm run server
  echo Starting Synora with the MySQL database...
) else (
  echo Starting Synora - browser storage only. See database\README.md to add MySQL.
)
rem Vite opens the browser itself as soon as the dev server is ready.
call npm run dev -- --open
if errorlevel 1 pause

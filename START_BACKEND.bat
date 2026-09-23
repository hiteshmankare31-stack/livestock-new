@echo off
cd /d "%~dp0backend"
if not exist node_modules (
  echo Installing backend packages...
  call npm install
)
echo Starting Smart Livestock API on http://localhost:5000
node server.js
pause

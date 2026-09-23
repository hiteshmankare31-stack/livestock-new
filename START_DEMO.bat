@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   SMART LIVESTOCK - SIH DEMO
echo ============================================
echo.
echo Starting backend on http://localhost:5000 ...
start "Smart Livestock Backend" cmd /k "cd /d "%~dp0backend" && if not exist node_modules npm install && node server.js"
timeout /t 3 /nobreak >nul

echo Starting frontend on http://localhost:5500 ...
where py >nul 2>&1
if %errorlevel%==0 (
  start "Smart Livestock Frontend" cmd /k "cd /d "%~dp0frontend" && py -m http.server 5500"
) else (
  start "Smart Livestock Frontend" cmd /k "cd /d "%~dp0frontend" && python -m http.server 5500"
)
timeout /t 2 /nobreak >nul
start "" http://localhost:5500/index.html
echo Demo login: enter your name and choose a role. No password required.
echo.
endlocal

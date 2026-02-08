@echo off
echo ========================================
echo Starting Aura AI Assistant Services
echo ========================================
echo.

echo [1/3] Starting Local Agent (Port 8787)...
start "Aura - Local Agent" cmd /k "cd server && node services/local-agent.js"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend Server (Port 3001)...
start "Aura - Backend" cmd /k "cd server && npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend (Port 5173)...
start "Aura - Frontend" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Local Agent:  http://127.0.0.1:8787
echo Backend:      http://localhost:3001
echo Frontend:     http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul

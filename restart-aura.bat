@echo off
echo Restarting Aura AI Assistant services...

echo Killing existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting frontend (Vite)...
start "Aura Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo Waiting 5 seconds...
timeout /t 5 /nobreak >nul

echo Starting backend server...
start "Aura Backend" cmd /k "cd /d %~dp0server && npm start"

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo Starting local agent...
start "Aura Agent" cmd /k "cd /d %~dp0server && node services/local-agent.js"

echo All services started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3001
echo Agent: http://localhost:8787

pause
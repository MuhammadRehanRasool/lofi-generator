@echo off
echo Starting Lofi Generator...
echo.

:: Start backend in new window
start "Lofi Backend" cmd /k "cd /d %~dp0backend && %~dp0.venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak > nul

:: Start frontend in new window
start "Lofi Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend running at: http://localhost:8000
echo Frontend running at: http://localhost:5173
echo.
echo Close the terminal windows to stop the servers.

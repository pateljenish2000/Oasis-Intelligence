@echo off
setlocal

cd /d "%~dp0"

echo ============================================
echo  Starting Oasis Intelligence (Modern Stack)
echo ============================================
echo.

if not exist "backend\venv" (
    echo Creating Python virtual environment in backend\venv...
    python -m venv backend\venv
    backend\venv\Scripts\pip.exe install --upgrade pip
    backend\venv\Scripts\pip.exe install -r backend\requirements.txt
)

echo [1/3] Starting FastAPI backend (Uvicorn on :8000)...
start "Backend - FastAPI" cmd /k "cd backend && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Vite React frontend (on :5173)...
start "Frontend - Vite React" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"

echo [3/3] Waiting for servers to spin up...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://127.0.0.1:5173

echo.
echo Backend API:  http://127.0.0.1:8000
echo Frontend App: http://127.0.0.1:5173
echo (Close the two new terminal windows to stop the servers)
endlocal

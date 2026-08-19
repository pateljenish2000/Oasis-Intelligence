#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

echo "============================================"
echo " Starting Oasis Intelligence (Modern Stack)"
echo "============================================"
echo ""

if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install --upgrade pip
    backend/venv/bin/pip install -r backend/requirements.txt
fi

echo "[1/3] Starting FastAPI backend (Uvicorn on :8000)..."
(cd backend && ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/3] Starting Vite React frontend (on :5173)..."
(cd frontend && npm run dev -- --host 0.0.0.0 --port 5173) &
FRONTEND_PID=$!

trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

echo "[3/3] Servers started."
echo "Backend API:  http://127.0.0.1:8000"
echo "Frontend App: http://127.0.0.1:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
wait $BACKEND_PID $FRONTEND_PID

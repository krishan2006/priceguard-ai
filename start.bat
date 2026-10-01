@echo off
title PriceGuard AI - Starting...
echo.
echo ================================================
echo   PriceGuard AI - Autonomous Price Monitor
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

:: Setup Backend
echo [1/4] Setting up backend...
cd backend
if not exist ".env" (
    copy .env.example .env >nul
    echo [INFO] Created .env file. Add your API keys if desired.
)
if not exist "venv" (
    echo [2/4] Creating Python virtual environment...
    python -m venv venv
)
echo [3/4] Installing Python dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
cd ..

:: Setup Frontend
echo [4/4] Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo.
echo [SUCCESS] Setup complete!
echo.
echo Starting backend on http://localhost:8000 ...
start "PriceGuard Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo Starting frontend on http://localhost:5173 ...
start "PriceGuard Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ================================================
echo   PriceGuard AI is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ================================================
echo.
pause

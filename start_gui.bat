@echo off
REM AI Video Generator - Streamlit GUI Startup Script (Windows)

echo 🎬 Starting AI Video Generator GUI...
echo ===========================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is required but not installed.
    echo Please install Python 3.8 or higher and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please create a .env file with your API keys:
    echo OPENAI_API_KEY=your_openai_api_key_here
    echo REPLICATE_API_TOKEN=your_replicate_api_token_here
    pause
    exit /b 1
)

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo ❌ requirements.txt not found!
    pause
    exit /b 1
)

REM Install dependencies if not already installed
echo 📦 Installing dependencies...
pip install -r requirements.txt

REM Check if app.py exists
if not exist "app.py" (
    echo ❌ app.py not found!
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo 🚀 Starting Streamlit app...
echo ===========================================
echo 📍 The app will open in your browser automatically
echo 🔗 If it doesn't open, go to: http://localhost:8501
echo ⏹️  Press Ctrl+C to stop the application
echo ===========================================

REM Start the Streamlit app
streamlit run app.py

pause 
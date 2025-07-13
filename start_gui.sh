#!/bin/bash

# AI Video Generator - Streamlit GUI Startup Script

echo "🎬 Starting AI Video Generator GUI..."
echo "==========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8 or higher and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your API keys:"
    echo "OPENAI_API_KEY=your_openai_api_key_here"
    echo "REPLICATE_API_TOKEN=your_replicate_api_token_here"
    exit 1
fi

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt not found!"
    exit 1
fi

# Install dependencies if not already installed
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Check if app.py exists
if [ ! -f "app.py" ]; then
    echo "❌ app.py not found!"
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo "🚀 Starting Streamlit app..."
echo "==========================================="
echo "📍 The app will open in your browser automatically"
echo "🔗 If it doesn't open, go to: http://localhost:8501"
echo "⏹️  Press Ctrl+C to stop the application"
echo "==========================================="

# Start the Streamlit app
streamlit run app.py 
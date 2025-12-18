#!/bin/bash

# Start Agent API with virtual environment
cd "$(dirname "$0")"

echo "🚀 Starting Senpex Agent API..."
echo "==============================="
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env exists
if [ ! -f "../.env" ] && [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
fi

# Start the server
echo "Starting FastAPI server on http://localhost:8080"
echo "Press Ctrl+C to stop"
echo ""

exec uvicorn main:app --host 0.0.0.0 --port 8080 --reload



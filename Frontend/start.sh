#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping BISIG services..."
    # Kill background jobs
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "🚀 Starting BISIG System..."

# 1. Start Python API (Backend)
echo "📂 Setting up Backend..."
if [ -d "BISIG-API" ]; then
    cd BISIG-API
    if [ -f "requirements.txt" ]; then
        echo "   Checking/Installing backend dependencies..."
        pip install -r requirements.txt --quiet
    fi
    
    echo "   Starting API at http://0.0.0.0:8000..."
    # Start uvicorn in background, redirecting output to a log file for debugging
    nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
    API_PID=$!
    cd ..
else
    echo "❌ Error: BISIG-API directory not found!"
    exit 1
fi

# 2. Start Frontend & Node Server
echo "💻 Setting up Frontend..."
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "   Installing frontend dependencies..."
        npm install --silent
    fi
    
    echo "   Starting Frontend at http://0.0.0.0:5173..."
    # Start frontend in background, redirecting output
    nohup npm run dev > frontend.log 2>&1 &
    FRONTEND_PID=$!
else
    echo "❌ Error: package.json not found!"
    kill $API_PID
    exit 1
fi

echo ""
echo "✨ All services are running in the background!"
echo "🔗 Frontend: https://${CODESPACE_NAME}-5173.app.github.dev"
echo "🔗 Backend:  https://${CODESPACE_NAME}-8000.app.github.dev"
echo "📜 Logs are being written to 'BISIG-API/backend.log' and 'frontend.log'"
echo "💡 Press Ctrl+C to stop all services."

# Keep script running to maintain background processes
wait

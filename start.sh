#!/bin/bash

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "Stopping BISIG services..."
    # Kill all background jobs started by this script
    kill $(jobs -p)
    exit
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM

echo "🚀 Starting BISIG System..."

# 1. Start Python API (Backend)
echo "📂 Starting API at http://localhost:8000..."
cd BISIG-API
uvicorn main:app --host 0.0.0.0 --port 8000 &
API_PID=$!
cd ..

# 2. Start Frontend & Node Server
echo "💻 Starting Frontend at http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

echo "✨ All services are running! Press Ctrl+C to stop."

# Wait for background processes
wait

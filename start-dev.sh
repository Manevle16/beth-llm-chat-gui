#!/bin/bash

echo "🚀 Starting Beth LLM Chat Development Environment"
echo "================================================"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if backend port is available
echo "🔍 Checking backend port (4000)..."
if ! check_port 4000; then
    echo "💡 Please stop the service using port 4000 or change the PORT in beth-llm-chat-service/.env"
    exit 1
fi

# Check if frontend port is available
echo "🔍 Checking frontend port (3000)..."
if ! check_port 3000; then
    echo "💡 React will automatically use the next available port"
fi

echo ""
echo "📋 Starting services..."
echo ""

# Start backend service
echo "🔧 Starting backend service (port 4000)..."
cd ../beth-llm-chat-service
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend service
echo "🎨 Starting frontend service (port 3000)..."
cd ../beth-llm-chat-gui
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo "📊 Backend: http://localhost:4000"
echo "🎮 GraphQL Playground: http://localhost:4000/graphql"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait 
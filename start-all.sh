#!/bin/bash

# StreamSense - Start All Services Script
# This script starts all backend services AND the frontend

echo "🚀 Starting StreamSense - All Services"
echo ""
echo "This will start:"
echo "  📡 Chat Ingestion (Port 8080)"
echo "  🔧 Dashboard API (Port 8082)"
echo "  🤖 AI Agents (Python)"
echo "  💻 Frontend Dashboard (Port 3000)"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs
mkdir -p .pids
# Clean up stale pidfiles from previous runs
rm -f .pids/*.pid || true

# Check if .env file exists
if [ ! -f config/.env ]; then
    echo "❌ Error: config/.env file not found!"
    echo "   Please copy config/.env.example to config/.env and fill in your credentials."
    exit 1
fi

# Check Google Cloud authentication
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
    echo "⚠️  Warning: Google Cloud authentication not detected!"
    echo "   Services may fail to start without proper authentication."
    echo ""
    echo "   Please set up authentication using one of these methods:"
    echo "   1. Run: gcloud auth application-default login"
    echo "   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "Starting services..."
echo ""

# Start chat-ingestion service
echo "📡 Starting Chat Ingestion Service (Port 8080)..."
cd backend/chat-ingestion
go run main.go > ../../logs/chat-ingestion.log 2>&1 &
CHAT_PID=$!
echo "   Started with PID: $CHAT_PID"
echo $CHAT_PID > ../../.pids/chat-ingestion.pid
cd ../..
sleep 2

# Start dashboard-api service
echo "🔧 Starting Dashboard API Service (Port 8082)..."
cd backend/dashboard-api
go run main.go > ../../logs/dashboard-api.log 2>&1 &
API_PID=$!
echo "   Started with PID: $API_PID"
echo $API_PID > ../../.pids/dashboard-api.pid
cd ../..
sleep 2

# Start agents orchestrator
echo "🤖 Starting AI Agents Orchestrator..."
cd backend/agents
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi
python orchestrator.py > ../../logs/agents.log 2>&1 &
AGENTS_PID=$!
echo "   Started with PID: $AGENTS_PID"
echo $AGENTS_PID > ../../.pids/agents.pid
cd ../..
sleep 2

# Start frontend
echo "💻 Starting Frontend Dashboard (Port 3000)..."
cd frontend/dashboard
npm start > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Started with PID: $FRONTEND_PID"
echo $FRONTEND_PID > ../../.pids/frontend.pid
cd ../..

# Wait a moment for services to initialize
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 8

echo ""
echo "✅ All services started!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Service Status:"
echo "  📡 Chat Ingestion: http://localhost:8080 (PID: $CHAT_PID)"
echo "  🔧 Dashboard API:  http://localhost:8082 (PID: $API_PID)"
echo "  🤖 AI Agents:      Running (PID: $AGENTS_PID)"
echo "  💻 Frontend:       http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Open your browser to: http://localhost:3000"
echo ""
echo "📋 View logs:"
echo "  tail -f logs/chat-ingestion.log"
echo "  tail -f logs/dashboard-api.log"
echo "  tail -f logs/agents.log"
echo "  tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "  ./stop-all.sh"
echo ""
echo "💾 PIDs saved to .all-pids"
echo "$CHAT_PID $API_PID $AGENTS_PID $FRONTEND_PID" > .all-pids

# Try to open browser automatically
echo "🌐 Attempting to open browser..."
sleep 5
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
else
    echo "   Please manually open: http://localhost:3000"
fi

echo ""
echo "🎉 StreamSense is now running!"
echo "   Press Ctrl+C or run './stop-all.sh' to stop all services"

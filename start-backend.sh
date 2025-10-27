#!/bin/bash

# StreamSense Backend Startup Script

echo "🚀 Starting StreamSense Backend Services..."
echo ""

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
    echo "   3. Use Firestore emulator (see config/README.md)"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Start chat-ingestion service
echo "📡 Starting Chat Ingestion Service (Port 8080)..."
cd backend/chat-ingestion
go run main.go > ../../logs/chat-ingestion.log 2>&1 &
CHAT_PID=$!
echo "   PID: $CHAT_PID"
cd ../..

sleep 2

# Start dashboard-api service
echo "🔧 Starting Dashboard API Service (Port 8082)..."
cd backend/dashboard-api
go run main.go > ../../logs/dashboard-api.log 2>&1 &
API_PID=$!
echo "   PID: $API_PID"
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
echo "   PID: $AGENTS_PID"
cd ../..

echo ""
echo "✅ All backend services started!"
echo ""
echo "Service Status:"
echo "  📡 Chat Ingestion: http://localhost:8080 (PID: $CHAT_PID)"
echo "  🔧 Dashboard API:  http://localhost:8082 (PID: $API_PID)"
echo "  🤖 AI Agents:      Running (PID: $AGENTS_PID)"
echo ""
echo "Logs:"
echo "  tail -f logs/chat-ingestion.log"
echo "  tail -f logs/dashboard-api.log"
echo "  tail -f logs/agents.log"
echo ""
echo "To stop all services:"
echo "  kill $CHAT_PID $API_PID $AGENTS_PID"
echo ""
echo "PIDs saved to .backend-pids"
echo "$CHAT_PID $API_PID $AGENTS_PID" > .backend-pids

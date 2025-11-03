#!/bin/bash

# StreamSense - NUCLEAR KILL SWITCH
# This script aggressively stops ALL StreamSense services

echo "🛑 StreamSense - STOPPING ALL SERVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PIDS_DIR=".pids"
STOPPED_COUNT=0
FAILED_COUNT=0

# Function to kill a process and all its children
kill_process_tree() {
    local PID=$1
    local NAME=$2

    if [ -z "$PID" ]; then
        return
    fi

    # Check if process exists
    if ! ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️  $NAME (PID: $PID) - Already stopped"
        return
    fi

    echo "🔻 Stopping $NAME (PID: $PID)..."

    # Get all child processes
    CHILD_PIDS=$(pgrep -P "$PID" 2>/dev/null || true)

    # Try graceful shutdown first
    kill "$PID" 2>/dev/null || true
    sleep 1

    # Check if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "   ⚠️  Process still running, sending SIGKILL..."
        # Kill the entire process group (all children too)
        kill -9 -"$PID" 2>/dev/null || true
        kill -9 "$PID" 2>/dev/null || true

        # Kill child processes individually if needed
        if [ ! -z "$CHILD_PIDS" ]; then
            for CHILD_PID in $CHILD_PIDS; do
                kill -9 "$CHILD_PID" 2>/dev/null || true
            done
        fi
        sleep 1
    fi

    # Final check
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "   ❌ FAILED to stop $NAME (PID: $PID)"
        FAILED_COUNT=$((FAILED_COUNT + 1))
    else
        echo "   ✅ $NAME stopped successfully"
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
    fi
}

# Stop services by PID files
echo "📋 Stopping services from PID files..."
echo ""

if [ -f "$PIDS_DIR/chat-ingestion.pid" ]; then
    CHAT_PID=$(cat "$PIDS_DIR/chat-ingestion.pid" 2>/dev/null)
    kill_process_tree "$CHAT_PID" "Chat Ingestion"
    rm -f "$PIDS_DIR/chat-ingestion.pid"
fi

if [ -f "$PIDS_DIR/dashboard-api.pid" ]; then
    API_PID=$(cat "$PIDS_DIR/dashboard-api.pid" 2>/dev/null)
    kill_process_tree "$API_PID" "Dashboard API"
    rm -f "$PIDS_DIR/dashboard-api.pid"
fi

if [ -f "$PIDS_DIR/agents.pid" ]; then
    AGENTS_PID=$(cat "$PIDS_DIR/agents.pid" 2>/dev/null)
    kill_process_tree "$AGENTS_PID" "AI Agents"
    rm -f "$PIDS_DIR/agents.pid"
fi

if [ -f "$PIDS_DIR/insight-processor.pid" ]; then
    INSIGHT_PID=$(cat "$PIDS_DIR/insight-processor.pid" 2>/dev/null)
    kill_process_tree "$INSIGHT_PID" "Insight Processor"
    rm -f "$PIDS_DIR/insight-processor.pid"
fi

if [ -f "$PIDS_DIR/frontend.pid" ]; then
    FRONTEND_PID=$(cat "$PIDS_DIR/frontend.pid" 2>/dev/null)
    kill_process_tree "$FRONTEND_PID" "Frontend"
    rm -f "$PIDS_DIR/frontend.pid"
fi

echo ""
echo "🔍 Searching for any remaining StreamSense processes..."
echo ""

# Kill any remaining processes by port
echo "🔌 Killing processes on ports 3000, 8080, 8082..."
for PORT in 3000 8080 8082; do
    PORT_PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ ! -z "$PORT_PIDS" ]; then
        echo "   Found process on port $PORT (PIDs: $PORT_PIDS)"
        for PID in $PORT_PIDS; do
            kill -9 "$PID" 2>/dev/null || true
        done
        STOPPED_COUNT=$((STOPPED_COUNT + 1))
        echo "   ✅ Killed processes on port $PORT"
    fi
done

# Kill any remaining Go processes running our services
echo ""
echo "🔧 Killing any remaining Go processes..."
GO_PIDS=$(ps aux | grep -E "(go run.*main.go|chat-ingestion|dashboard-api)" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$GO_PIDS" ]; then
    echo "   Found Go processes: $GO_PIDS"
    for PID in $GO_PIDS; do
        kill -9 "$PID" 2>/dev/null || true
    done
    STOPPED_COUNT=$((STOPPED_COUNT + 1))
    echo "   ✅ Killed remaining Go processes"
fi

# Kill orphaned 'main' binaries (compiled Go binaries that keep running)
echo ""
echo "🔨 Killing orphaned 'main' binaries..."
# Find main processes that have our log files open
MAIN_PIDS=$(lsof logs/*.log 2>/dev/null | grep "main" | awk '{print $2}' | sort -u || true)
if [ ! -z "$MAIN_PIDS" ]; then
    echo "   Found orphaned main binaries: $MAIN_PIDS"
    for PID in $MAIN_PIDS; do
        kill -9 "$PID" 2>/dev/null || true
    done
    STOPPED_COUNT=$((STOPPED_COUNT + 1))
    echo "   ✅ Killed orphaned main binaries"
fi

# Kill any remaining Python orchestrator processes
echo ""
echo "�� Killing any remaining Python orchestrator processes..."
PYTHON_PIDS=$(ps aux | grep -E "(orchestrator\.py|insight_processor\.py)" | grep -v grep | awk '{print $2}' || true)
if [ ! -z "$PYTHON_PIDS" ]; then
    echo "   Found Python processes: $PYTHON_PIDS"
    for PID in $PYTHON_PIDS; do
        kill -9 "$PID" 2>/dev/null || true
    done
    STOPPED_COUNT=$((STOPPED_COUNT + 1))
    echo "   ✅ Killed remaining Python processes"
fi

# Kill any remaining npm/node processes from our frontend
echo ""
echo "💻 Killing any remaining frontend (npm/node) processes..."
NODE_PIDS=$(ps aux | grep -E "(npm start|react-scripts)" | grep -v grep | grep -i streamsense | awk '{print $2}' || true)
if [ ! -z "$NODE_PIDS" ]; then
    echo "   Found Node processes: $NODE_PIDS"
    for PID in $NODE_PIDS; do
        kill -9 "$PID" 2>/dev/null || true
    done
    STOPPED_COUNT=$((STOPPED_COUNT + 1))
    echo "   ✅ Killed remaining Node processes"
fi

# Clean up PID files
echo ""
echo "🧹 Cleaning up PID files..."
rm -f .all-pids 2>/dev/null || true
rm -rf "$PIDS_DIR" 2>/dev/null || true
mkdir -p "$PIDS_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Final Verification:"
echo ""

# Check ports
echo "   Checking ports..."
PORT_CHECK=$(lsof -i :3000 -i :8080 -i :8082 2>/dev/null | grep LISTEN || true)
if [ -z "$PORT_CHECK" ]; then
    echo "   ✅ All ports (3000, 8080, 8082) are free"
else
    echo "   ⚠️  Some ports still in use:"
    echo "$PORT_CHECK" | awk '{print "      " $0}'
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

# Check for remaining processes
echo ""
echo "   Checking for remaining StreamSense processes..."
REMAINING=$(ps aux | grep -E "(chat-ingestion|dashboard-api|orchestrator\.py|insight_processor\.py)" | grep -v grep || true)
if [ -z "$REMAINING" ]; then
    echo "   ✅ No StreamSense processes found"
else
    echo "   ⚠️  Some processes still running:"
    echo "$REMAINING" | awk '{print "      " $0}'
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAILED_COUNT -eq 0 ]; then
    echo "✅ SUCCESS! All StreamSense services stopped cleanly."
    echo ""
    echo "   To start again: ./start-all.sh"
else
    echo "⚠️  WARNING! Some services may still be running."
    echo ""
    echo "   Stopped: $STOPPED_COUNT | Failed: $FAILED_COUNT"
    echo ""
    echo "   Manual cleanup commands:"
    echo "   - Check all processes: ps aux | grep -E '(chat-ingestion|dashboard-api|orchestrator|npm)'"
    echo "   - Kill specific PID: kill -9 <PID>"
    echo "   - Check ports: lsof -i :3000 -i :8080 -i :8082"
fi

echo ""
echo "🎯 Stop script completed!"
echo ""

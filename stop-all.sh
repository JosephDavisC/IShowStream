#!/bin/bash

# StreamSense - Stop All Services Script (improved)

set -euo pipefail

PIDS_DIR=".pids"
mkdir -p "$PIDS_DIR"

echo "🛑 Stopping StreamSense - All Services"

stop_by_file() {
  local pidfile="$1"
  local name="$2"

  if [ ! -f "$pidfile" ]; then
    echo "⚠️  No pidfile for $name ($pidfile)"
    return
  fi

  PID=$(cat "$pidfile" 2>/dev/null || true)
  if [ -z "$PID" ]; then
    echo "⚠️  Empty pidfile for $name"
    rm -f "$pidfile"
    return
  fi

  if ps -p "$PID" > /dev/null 2>&1; then
    echo "🔻 Stopping $name (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 2
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "   ⚠️  $name did not exit, sending SIGKILL..."
      kill -9 "$PID" 2>/dev/null || true
      sleep 1
    fi
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "   ❌ Failed to stop $name (PID: $PID)"
    else
      echo "   ✅ $name stopped"
    fi
  else
    echo "⚠️  $name not running (PID: $PID)"
  fi

  rm -f "$pidfile"
}

stop_by_file ".pids/chat-ingestion.pid" "Chat Ingestion"
stop_by_file ".pids/dashboard-api.pid" "Dashboard API"
stop_by_file ".pids/agents.pid" "AI Agents"
stop_by_file ".pids/frontend.pid" "Frontend Dashboard"

echo "\nCleanup: removing leftover .all-pids if present..."
#!/bin/bash

# StreamSense - Stop All Services Script (improved)

set -euo pipefail

PIDS_DIR=".pids"
mkdir -p "$PIDS_DIR"

echo "\ud83d\uded1 Stopping StreamSense - All Services"

stop_by_file() {
  local pidfile="$1"
  local name="$2"

  if [ ! -f "$pidfile" ]; then
    echo "\u26a0\ufe0f  No pidfile for $name ($pidfile)"
    return
  fi

  PID=$(cat "$pidfile" 2>/dev/null || true)
  if [ -z "$PID" ]; then
    echo "\u26a0\ufe0f  Empty pidfile for $name"
    rm -f "$pidfile"
    return
  fi

  if ps -p "$PID" > /dev/null 2>&1; then
    echo "\ud83d\udd3b Stopping $name (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 2
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "   \u26a0\ufe0f  $name did not exit, sending SIGKILL..."
      kill -9 "$PID" 2>/dev/null || true
      sleep 1
    fi
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "   \u274c Failed to stop $name (PID: $PID)"
    else
      echo "   \u2705 $name stopped"
    fi
  else
    echo "\u26a0\ufe0f  $name not running (PID: $PID)"
  fi

  rm -f "$pidfile"
}

stop_by_file ".pids/chat-ingestion.pid" "Chat Ingestion"
stop_by_file ".pids/dashboard-api.pid" "Dashboard API"
stop_by_file ".pids/agents.pid" "AI Agents"
stop_by_file ".pids/frontend.pid" "Frontend Dashboard"

echo "📋 You can verify with:"
rm -f .all-pids || true

echo "  ps aux | grep -E 'chat-ingestion|dashboard-api|orchestrator|npm'"
echo "  ps aux | grep -E 'chat-ingestion|dashboard-api|orchestrator|react-scripts|node'"
echo "To start again: ./start-all.sh"

echo ""
echo "To restart everything, run:"
echo "  ./start-all.sh"
echo ""
echo "🎯 Done!"

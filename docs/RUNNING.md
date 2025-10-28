# How to Run StreamSense

This guide will teach you how to start and stop all StreamSense services manually in your terminal.

## Prerequisites

Make sure you have:
- ✅ Go installed (`go version`)
- ✅ Node.js installed (`node --version`)
- ✅ Python 3 installed (`python3 --version`)
- ✅ Google Cloud authentication set up (`gcloud auth application-default login`)
- ✅ Environment variables configured in `config/.env`

## Quick Start (All Services)

### Option 1: Use the startup script
```bash
./start-backend.sh
```

Then in a separate terminal:
```bash
cd frontend/dashboard
npm start
```

### Option 2: Manual startup (recommended for learning)

Follow the steps below to start each service individually.

---

## Running Services Individually

### Terminal 1: Chat Ingestion Service (Port 8080)

This service connects to Twitch and ingests chat messages.

```bash
# Navigate to the service directory
cd backend/chat-ingestion

# Run the service
go run main.go
```

**What you'll see:**
```
✅ Connected to Firestore
🎮 Joined channel: jasontheween
🚀 StreamSense Chat Ingestion Service Started!
✅ Connected to Twitch IRC
📡 Listening for messages...
[channel] username: message content
📊 Stats: X messages in 30s (X.XX msg/sec)
```

**To stop:** Press `Ctrl+C`

---

### Terminal 2: Dashboard API Service (Port 8082)

This service provides the REST API for the dashboard.

```bash
# Navigate to the service directory
cd backend/dashboard-api

# Run the service
go run main.go
```

**What you'll see:**
```
✅ Connected to Firestore
🚀 Dashboard API starting on port 8082
```

**Test it works:**
```bash
curl http://localhost:8082/health
# Should return: OK
```

**To stop:** Press `Ctrl+C`

---

### Terminal 3: AI Agents Service (Python)

This service runs the AI agents that analyze chat messages.

```bash
# Navigate to the agents directory
cd backend/agents

# Activate the virtual environment
source venv/bin/activate

# Run the orchestrator
python orchestrator.py
```

**What you'll see:**
```
(Processing messages in the background)
```

**To stop:** Press `Ctrl+C`, then type `deactivate` to exit the virtual environment

---

### Terminal 4: Frontend Dashboard (Port 3000)

This is the React web interface.

```bash
# Navigate to the frontend directory
cd frontend/dashboard

# Start the development server
npm start
```

**What you'll see:**
```
Starting the development server...
Compiled successfully!

You can now view dashboard in the browser.

  Local:            http://localhost:3000
```

**Your browser should automatically open.** If not, go to: **http://localhost:3000**

**To stop:** Press `Ctrl+C`

---

## Service Overview

| Service | Port | Command | Directory |
|---------|------|---------|-----------|
| Chat Ingestion | 8080 | `go run main.go` | `backend/chat-ingestion` |
| Dashboard API | 8082 | `go run main.go` | `backend/dashboard-api` |
| AI Agents | - | `python orchestrator.py` | `backend/agents` |
| Frontend | 3000 | `npm start` | `frontend/dashboard` |

---

## Stopping All Services

### If you started services manually:
1. Go to each terminal window
2. Press `Ctrl+C` to stop each service

### If you used the startup script:
```bash
# Check for process IDs
cat .backend-pids

# Kill all backend processes
kill $(cat .backend-pids)

# Or kill by port
lsof -ti:8080,8082,3000 | xargs kill
```

---

## Troubleshooting

### Port already in use
```bash
# Find what's using the port (e.g., 3000)
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### "Module not found" errors (Python)
```bash
cd backend/agents
source venv/bin/activate
pip install -r requirements.txt
```

### "Package not found" errors (Frontend)
```bash
cd frontend/dashboard
npm install
```

### Firestore authentication errors
```bash
# Re-authenticate with Google Cloud
gcloud auth application-default login
```

### Can't connect to services
Make sure all 4 services are running:
```bash
# Check what's running on your ports
lsof -ti:3000,8080,8082
```

---

## Development Tips

### Watch live chat ingestion:
```bash
# In the chat-ingestion terminal, you'll see real-time messages
[jasontheween] username: message content
```

### Check API responses:
```bash
# Get current stats
curl http://localhost:8082/api/stats

# Get recent messages
curl http://localhost:8082/api/messages/recent

# Get AI insights
curl http://localhost:8082/api/insights/latest
```

### View logs:
If you used the startup script, logs are saved to:
```bash
tail -f logs/chat-ingestion.log
tail -f logs/dashboard-api.log
tail -f logs/agents.log
```

---

## Typical Workflow

1. **Start backend services** (Terminals 1, 2, 3)
   - Chat Ingestion
   - Dashboard API
   - AI Agents

2. **Wait 10-20 seconds** for messages to be ingested and processed

3. **Start frontend** (Terminal 4)
   - Dashboard will show live data

4. **Open browser** to http://localhost:3000

5. **When done**, press `Ctrl+C` in all terminals

---

## Next Steps

- Edit `config/.env` to change the Twitch channel
- Modify AI agent prompts in `backend/agents/`
- Customize the dashboard UI in `frontend/dashboard/src/`

Happy streaming! 🎮🚀

# 🚀 Quick Start Guide

## Prerequisites Check ✅

You have:
- ✅ Go installed
- ✅ Python 3 installed  
- ✅ Node.js & npm installed
- ✅ Python venv exists
- ✅ config/.env file exists

**No Docker needed!**

## Start Everything (Easy Way)

### Option 1: Start All Services (Recommended)

```bash
# From project root
./start-all.sh
```

This will start:
- 📡 Chat Ingestion (Port 8080)
- 🔧 Dashboard API (Port 8082)  
- 🤖 AI Agents (Python)
- 🧠 Insight Processor
- 💻 Frontend Dashboard (Port 3000)

### Option 2: Manual Start (If you need more control)

#### 1. Start Backend Services

**Terminal 1 - Chat Ingestion:**
```bash
cd backend/chat-ingestion
go run main.go
```

**Terminal 2 - Dashboard API:**
```bash
cd backend/dashboard-api
go run main.go
```

**Terminal 3 - AI Agents:**
```bash
cd backend/agents
source venv/bin/activate
python orchestrator.py
```

**Terminal 4 - Insight Processor:**
```bash
cd backend/agents
source venv/bin/activate
python insight_processor.py
```

#### 2. Start Frontend

**Terminal 5 - Frontend:**
```bash
cd frontend/dashboard
npm start
```

## Access the Application

Once everything is running:
- 🌐 Frontend: http://localhost:3000
- 🔧 API: http://localhost:8082

## Stop Everything

```bash
./stop-all.sh
```

Or manually stop each service (Ctrl+C in each terminal).

## Troubleshooting

### If services fail to start:

1. **Check Google Cloud auth:**
   ```bash
   gcloud auth application-default login
   ```

2. **Check Firestore rules are set:**
   - Go to: https://console.firebase.google.com/project/streamsense-476705/firestore/rules
   - See `FIRESTORE_RULES.md` for rules to add

3. **Check logs:**
   ```bash
   tail -f logs/frontend.log
   tail -f logs/dashboard-api.log
   tail -f logs/chat-ingestion.log
   tail -f logs/agents.log
   ```

## First Time Setup

If you haven't set up before:

1. **Install Python dependencies** (if needed):
   ```bash
   cd backend/agents
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Install frontend dependencies** (if needed):
   ```bash
   cd frontend/dashboard
   npm install
   ```

3. **Set up Firebase Authentication:**
   - See `frontend/dashboard/FIREBASE_SETUP.md`
   - Configure Firestore security rules (see `FIRESTORE_RULES.md`)

That's it! Just run `./start-all.sh` and you're good to go! 🎉


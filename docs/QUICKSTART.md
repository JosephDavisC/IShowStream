# StreamSense Quick Start Cheat Sheet

## 🚀 EASIEST Way - One Command for Everything!

```bash
./start-all.sh
```

That's it! Everything will start and your browser will open automatically.

To stop:
```bash
./stop-all.sh
```

---

## 🚀 Alternative - Manual Control (4 Terminals)

### Terminal 1 - Chat Ingestion:
```bash
cd backend/chat-ingestion
go run main.go
```

### Terminal 2 - Dashboard API:
```bash
cd backend/dashboard-api
go run main.go
```

### Terminal 3 - AI Agents:
```bash
cd backend/agents
source venv/bin/activate
python orchestrator.py
```

### Terminal 4 - Frontend:
```bash
cd frontend/dashboard
npm start
```

Then open: **http://localhost:3000**

---

## 🛑 Stop Everything

Press `Ctrl+C` in each terminal

Or run:
```bash
./stop-all.sh
```

---

## 📋 Essential Commands

### Check what's running:
```bash
lsof -ti:3000,8080,8082
```

### Test API:
```bash
curl http://localhost:8082/health
```

### View live data:
```bash
curl http://localhost:8082/api/stats
curl http://localhost:8082/api/messages/recent
```

### Kill specific port:
```bash
kill -9 $(lsof -ti:3000)  # Frontend
kill -9 $(lsof -ti:8080)  # Chat Ingestion
kill -9 $(lsof -ti:8082)  # API
```

---

## 🎮 Service Ports

- **Frontend**: http://localhost:3000
- **Chat Ingestion**: Port 8080 (internal)
- **Dashboard API**: http://localhost:8082
- **AI Agents**: Background process

---

## 🔧 Need Help?

Read the full guide: `RUNNING.md`

Check configuration: `config/README.md`

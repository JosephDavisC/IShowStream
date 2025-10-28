# 🚀 The Easiest Way to Run StreamSense

## One Command. That's It.

```bash
./start-all.sh
```

## What Happens?

```
┌─────────────────────────────────────────────────────────────┐
│  ./start-all.sh                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ├─► 📡 Chat Ingestion (Port 8080)
                           │   └─ Connects to Twitch
                           │
                           ├─► 🔧 Dashboard API (Port 8082)
                           │   └─ Connects to Firestore
                           │
                           ├─► 🤖 AI Agents
                           │   └─ Processes messages
                           │
                           └─► 💻 Frontend (Port 3000)
                               └─ Opens in your browser
```

## To Stop Everything

```bash
./stop-all.sh
```

## That's Literally It!

No need to open 4 terminals. No need to remember commands.
Just run one script and you're done! 🎉

---

## Where Are the Logs?

All service output is saved to `logs/` directory:

```bash
tail -f logs/chat-ingestion.log  # Watch Twitch messages
tail -f logs/dashboard-api.log    # Watch API requests
tail -f logs/agents.log           # Watch AI processing
tail -f logs/frontend.log         # Watch React build
```

---

## First Time Setup

1. **Install dependencies** (one time):
   ```bash
   # Already done if you have Go, Python, Node.js installed
   ```

2. **Configure credentials** (one time):
   ```bash
   cp config/.env.example config/.env
   # Edit config/.env with your API keys
   ```

3. **Authenticate Google Cloud** (one time):
   ```bash
   gcloud auth application-default login
   ```

4. **Run everything**:
   ```bash
   ./start-all.sh
   ```

Done! 🎮

---

## Troubleshooting

### Port already in use?
```bash
./stop-all.sh
./start-all.sh
```

### Services not starting?
Check the logs:
```bash
tail -f logs/*.log
```

### Need more help?
See [RUNNING.md](RUNNING.md) for detailed troubleshooting.

---

## What If I Want More Control?

### Start only backend services:
```bash
./start-backend.sh
```

### Start only frontend:
```bash
cd frontend/dashboard
npm start
```

### Start individual services:
See [QUICKSTART.md](QUICKSTART.md) or [RUNNING.md](RUNNING.md)

---

Made with 💜 for the easiest streaming analytics experience!

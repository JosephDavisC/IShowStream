# StreamSense - AI Chat Intelligence for Streamers

## Project Structure
- `backend/chat-ingestion/` - Go service for Twitch chat ingestion
- `backend/agents/` - Python ADK agents
- `backend/dashboard-api/` - Go API for dashboard
- `frontend/` - React dashboard UI

## Setup
1. Install dependencies (Go, Python, Node.js)
2. Configure `.env` with API credentials
3. Run services individually or with docker-compose

## Development

### ⚡ Fastest Way - One Command
```bash
./start-all.sh    # Starts everything (backend + frontend)
./stop-all.sh     # Stops everything
```

Then open: **http://localhost:3000**

### 📚 Documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick reference cheat sheet
- [RUNNING.md](RUNNING.md) - Detailed step-by-step guide and troubleshooting

### 🛠️ Alternative Scripts
- Start backend only: `./start-backend.sh`
- Start frontend only: `cd frontend/dashboard && npm start`

### 🔧 Manual Commands
- Chat Ingestion: `cd backend/chat-ingestion && go run main.go`
- Dashboard API: `cd backend/dashboard-api && go run main.go`
- Agents: `cd backend/agents && source venv/bin/activate && python orchestrator.py`
- Frontend: `cd frontend/dashboard && npm start`

## Cloud Run Deployment
```bash
gcloud run deploy [service-name] --source .
```

## Hackathon Submission
- Category: AI Agents
- Built with: Cloud Run, ADK, Gemini AI
- Demo: Live Twitch chat analysis

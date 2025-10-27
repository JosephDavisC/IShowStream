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
- Chat Ingestion: `cd backend/chat-ingestion && go run main.go`
- Agents: `cd backend/agents && python orchestrator.py`
- Dashboard API: `cd backend/dashboard-api && go run main.go`
- Frontend: `cd frontend && npm start`

## Cloud Run Deployment
```bash
gcloud run deploy [service-name] --source .
```

## Hackathon Submission
- Category: AI Agents
- Built with: Cloud Run, ADK, Gemini AI
- Demo: Live Twitch chat analysis

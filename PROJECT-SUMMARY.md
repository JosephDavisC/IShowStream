# StreamSense - Project Summary

## What It Is
AI-powered real-time Twitch chat analytics platform for streamers. Analyzes chat messages using 4 specialized AI agents and provides actionable insights via a live dashboard.

## Architecture & Tech Stack

**Backend Services:**
- Chat Ingestion (Go) - Port 8080: Connects to Twitch IRC, saves messages to Firestore
- Dashboard API (Go) - Port 8082: REST API + WebSocket server for real-time updates
- AI Agents (Python): 4 agents using Google Gemini 2.0 Flash
- Insight Processor (Python): Generates insights every 1 minute

**Frontend:**
- React dashboard (Port 3000) with real-time WebSocket updates
- Firebase Authentication (email/password + Google Sign-In)
- Pages: Login → Streamer Setup → Dashboard

**Database:**
- Firestore (Google Cloud) for messages, insights, agent activity

## Data Flow

```
Twitch IRC → Chat Ingestion → Firestore → AI Agents → Insights → Dashboard API → WebSocket → Frontend
```

## AI Agent System

1. **SpamFilterAgent** - Detects spam/bots (processes every message)
2. **PriorityAgent** - Ranks importance 1-10 (processes every message)
3. **EngagementAgent** - Predicts engagement (processes every message)
4. **TrendAgent** - Detects trends/memes (batch analysis every 5 min)

**Orchestrator** coordinates all agents, saves results to Firestore.

## Current Features

✅ Real-time message ingestion from Twitch IRC
✅ WebSocket broadcasting for instant message delivery
✅ Multi-agent AI analysis pipeline
✅ Authentication (Firebase Auth)
✅ Channel configuration UI
✅ Real-time dashboard with:
   - Live message feed
   - AI Insights (with animations, auto-hide, mark as resolved, history)
   - Priority messages
   - Stats
   - Agent activity log

## Workflow

1. User logs in (Firebase Auth)
2. Configures Twitch channel (updates `config/.env`)
3. Chat Ingestion connects to Twitch IRC
4. Messages saved to Firestore
5. AI Agents process messages → Store analysis
6. Dashboard API listens to Firestore → Broadcasts via WebSocket
7. Frontend receives real-time updates

## Key Files

- `backend/chat-ingestion/main.go` - Twitch IRC client
- `backend/dashboard-api/main.go` - API + WebSocket hub
- `backend/agents/orchestrator.py` - Agent coordinator
- `frontend/dashboard/src/components/Dashboard.js` - Main dashboard
- `frontend/dashboard/src/components/AIInsights.js` - Insights panel
- `config/.env` - Centralized configuration

## Configuration

Environment variables in `config/.env`:
- `GOOGLE_CLOUD_PROJECT` - Firestore project
- `GOOGLE_API_KEY` - Gemini AI key
- `TWITCH_CLIENT_ID/SECRET` - Twitch API
- `TWITCH_CHANNEL` - Channel to monitor
- `REACT_APP_FIREBASE_*` - Firebase config

## Performance

- Handles high-volume streams (4+ msg/sec)
- Real-time via WebSocket (<100ms latency)
- Async Firestore writes (non-blocking)
- Firestore listeners for real-time updates

## Deployment

- Local: `./start-all.sh` (starts all services)
- No Docker required
- Services: Go binaries, Python scripts, React dev server

# StreamSense - AI-Powered Twitch Chat Analytics

**Google Cloud Run Hackathon 2025 - AI Agents Category**

StreamSense is a real-time Twitch chat analysis platform powered by Google's **Agent Development Kit (ADK)** and **Gemini AI**, deployed on **Cloud Run**.

## 🤖 Multi-Agent System Architecture

StreamSense uses **two specialized AI agents** that work together to analyze Twitch chat in real-time:

### Agent Pipeline:
```
📨 Twitch Chat → 🔍 SpamFilterAgent → 🎯 PriorityAgent → 📊 Dashboard
```

### Agent 1: **SpamFilterAgent** (v2.0-ADK)
- **Role**: Spam Detection & Content Filtering
- **Model**: Gemini 2.0 Flash
- **Capabilities**:
  - Spam detection
  - Link scanning
  - Bot detection
  - Phishing identification
- **Output**: Spam classification with confidence scores

### Agent 2: **PriorityAgent** (v2.0-ADK)
- **Role**: Message Prioritization & Ranking
- **Model**: Gemini 2.0 Flash
- **Capabilities**:
  - Importance ranking (1-10)
  - Category classification
  - Actionability detection
- **Depends on**: SpamFilterAgent (only processes non-spam messages)
- **Output**: Priority scores to help streamers focus on important messages

### Multi-Agent Orchestration:
The **AgentOrchestrator** coordinates both agents in a sequential workflow:
1. Receives raw Twitch messages from Firestore
2. **Agent 1** filters spam → if spam, stop pipeline
3. **Agent 2** ranks importance → if clean, assign priority
4. Results aggregated and displayed on dashboard

**This demonstrates Google ADK patterns:**
- ✅ Agent specialization
- ✅ Sequential processing pipeline
- ✅ Conditional agent invocation
- ✅ State management across agents
- ✅ Agent-to-agent communication

---

## 🏗️ System Architecture

### Backend Services:
- **Chat Ingestion** (Go + Cloud Run) - Connects to Twitch IRC, streams messages to Firestore
- **Dashboard API** (Go + Cloud Run) - REST API for frontend
- **AI Agents** (Python + ADK + Cloud Run) - Multi-agent message analysis with Gemini

### Frontend:
- **React Dashboard** (Cloud Run) - Real-time chat visualization with AI insights

### Storage:
- **Firestore** - Real-time database for messages and agent analysis

---

## 🚀 Quick Start

### ⚡ One-Command Setup:
```bash
./start-all.sh    # Starts all services (backend + frontend)
```

Then open: **http://localhost:3000**

### 🛑 Stop Everything:
```bash
./stop-all.sh     # Nuclear kill switch - stops all services
```

---

## 📁 Project Structure

```
streamsense/
├── backend/
│   ├── chat-ingestion/     # Go - Twitch IRC ingestion service
│   │   ├── main.go
│   │   └── tools/          # Utility scripts (Firestore check, token gen)
│   ├── dashboard-api/      # Go - REST API for dashboard
│   │   └── main.go
│   └── agents/             # Python - ADK Multi-Agent System
│       ├── orchestrator.py        # Agent coordinator
│       ├── spam_filter_agent.py   # Agent 1: Spam detection
│       ├── priority_agent.py      # Agent 2: Priority ranking
│       └── requirements.txt
├── frontend/
│   └── dashboard/          # React - Real-time dashboard UI
│       ├── src/
│       └── package.json
├── config/
│   └── .env.example        # Environment variables template
├── start-all.sh            # One-command startup
└── stop-all.sh             # One-command shutdown
```

---

## ⚙️ Configuration

### 1. Setup Environment Variables:
```bash
cp config/.env.example config/.env
```

Edit `config/.env`:
```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_API_KEY=your-gemini-api-key

# Twitch
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
TWITCH_CHANNEL=xqc    # Channel to monitor
```

### 2. Authenticate with Google Cloud:
```bash
gcloud auth application-default login
```

### 3. Install Dependencies:
```bash
# Backend agents (Python)
cd backend/agents
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend/dashboard
npm install
```

---

## 🎮 Usage

### Automatic (Recommended):
```bash
./start-all.sh    # Starts everything
./stop-all.sh     # Stops everything
```

### Manual:
```bash
# Terminal 1: Chat Ingestion
cd backend/chat-ingestion
go run main.go

# Terminal 2: Dashboard API
cd backend/dashboard-api
go run main.go

# Terminal 3: AI Agents
cd backend/agents
source venv/bin/activate
python orchestrator.py

# Terminal 4: Frontend
cd frontend/dashboard
npm start
```

---

## 🤖 Testing Individual Agents

### Test SpamFilterAgent:
```bash
cd backend/agents
source venv/bin/activate
python spam_filter_agent.py
```

Output:
```
🤖 Testing ADK-Enhanced Spam Filter Agent
============================================================
Agent: SpamFilterAgent v2.0-ADK
Role: spam_detection
Capabilities: spam_detection, content_filtering, link_scanning, bot_detection
============================================================

📝 Message: [User1] great stream!
✅ Spam: NO (Confidence: 90%)
   Type: none
   Reason: Normal viewer comment
   Processed by: SpamFilterAgent v2.0-ADK
```

### Test PriorityAgent:
```bash
cd backend/agents
source venv/bin/activate
python priority_agent.py
```

Output:
```
🎯 Testing ADK-Enhanced Priority Agent
============================================================
Agent: PriorityAgent v2.0-ADK
Role: message_prioritization
Capabilities: message_prioritization, importance_ranking, category_classification
Depends on: SpamFilterAgent
============================================================

📝 [Subscriber] Audio is cutting out!
   🎯 Priority: 9/10 █████████░
   Category: technical
   Reason: Critical technical issue affecting stream quality
   Processed by: PriorityAgent v2.0-ADK
```

---

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Quick reference cheat sheet
- **[RUNNING.md](RUNNING.md)** - Detailed step-by-step guide with troubleshooting
- **[EASY-START.md](EASY-START.md)** - Visual guide for beginners
- **[config/README.md](config/README.md)** - Credentials and authentication setup

---

## ☁️ Cloud Run Deployment

### Deploy Chat Ingestion:
```bash
cd backend/chat-ingestion
gcloud run deploy chat-ingestion \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Deploy AI Agents:
```bash
cd backend/agents
gcloud run deploy agents \
  --source . \
  --region us-central1 \
  --set-env-vars GOOGLE_API_KEY=your-key
```

### Deploy Dashboard API:
```bash
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Deploy Frontend:
```bash
cd frontend/dashboard
gcloud run deploy dashboard \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 🛠️ Tech Stack

### Backend:
- **Go** - High-performance service layer (Chat Ingestion, Dashboard API)
- **Python** - AI agents with ADK and Gemini
- **Firestore** - Real-time NoSQL database
- **Twitch IRC** - Live chat streaming

### AI/ML:
- **Google Gemini 2.0 Flash** - LLM for spam detection and prioritization
- **LangGraph** - Multi-agent workflow orchestration
- **LangChain** - Agent framework integration
- **Google ADK** - Agent Development Kit patterns

### Frontend:
- **React** - Modern UI framework
- **Lucide Icons** - Beautiful icons
- **Twitch-style UI** - Purple theme (#9147ff)

### DevOps:
- **Cloud Run** - Serverless container platform
- **Docker** - Containerization
- **Git** - Version control

---

## 🎨 Features

### For Streamers:
- ✅ **Real-time chat monitoring** - See all messages as they happen
- ✅ **Automatic spam filtering** - AI removes spam/scams/bots
- ✅ **Priority highlighting** - Important messages stand out
- ✅ **Technical alerts** - Instant notification of stream issues
- ✅ **Subscriber boost** - Subscriber messages get priority +1

### For Viewers:
- ✅ **Clean chat experience** - Spam automatically filtered
- ✅ **Important messages surface** - Quality over quantity

### UI Features:
- ✅ **Horizontal/Vertical layout toggle** - Customize your view
- ✅ **Twitch-style design** - Familiar purple theme
- ✅ **Real-time updates** - Live polling every 2 seconds
- ✅ **AI insights panel** - See what the agents found

---

## 📊 Agent Analysis Output

Each message gets analyzed and tagged:

```json
{
  "message": "great stream!",
  "username": "Viewer123",
  "agent_analysis": {
    "spam": {
      "is_spam": false,
      "confidence": 90,
      "reason": "Normal viewer comment",
      "agent": "SpamFilterAgent",
      "spam_type": "none",
      "processed_by": "SpamFilterAgent",
      "agent_version": "2.0-ADK"
    },
    "priority": {
      "priority": 5,
      "category": "reaction",
      "reason": "Positive viewer engagement",
      "agent": "PriorityAgent",
      "actionable": true,
      "processed_by": "PriorityAgent",
      "agent_version": "2.0-ADK"
    },
    "processed_at": "2025-01-27T10:30:00Z",
    "pipeline_completed": true,
    "agents_executed": ["SpamFilterAgent", "PriorityAgent"]
  }
}
```

---

## 🧪 Development Tools

### Utility Scripts (in `backend/chat-ingestion/tools/`):
- **check-firestore/** - Verify Firestore connection and view messages
- **get-token/** - Generate Twitch OAuth token
- **test-connection/** - Test environment variables
- **view-analysis/** - View spam analysis results

---

## 🤝 Contributing

This is a hackathon project for Google Cloud Run Hackathon 2025.

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🏆 Built For

**Google Cloud Run Hackathon 2025**
- **Category**: AI Agents
- **Technologies**: Cloud Run, ADK, Gemini AI, LangGraph, Firestore
- **Team**: JJA

---

## 📞 Support

For issues or questions:
- Check [RUNNING.md](RUNNING.md) for troubleshooting
- Review [config/README.md](config/README.md) for setup help
- Open an issue on GitHub

---

**Made with ❤️ using Google Cloud Run, Gemini AI, and the Agent Development Kit**

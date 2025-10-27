# Chat Ingestion Utility Tools

This directory contains standalone utility scripts for testing and debugging the chat ingestion service.

## Available Tools

### 1. check-firestore
**Purpose**: Check Firestore connection and view recent messages

**Usage**:
```bash
cd backend/chat-ingestion/tools/check-firestore
go run main.go
```

**What it does**:
- Connects to Firestore
- Shows the last 20 messages from the `messages` collection
- Displays message metadata (timestamp, username, message text)

---

### 2. get-token
**Purpose**: Generate Twitch OAuth token

**Usage**:
```bash
cd backend/chat-ingestion/tools/get-token
go run main.go
```

**What it does**:
- Reads Twitch credentials from `config/.env`
- Requests an OAuth token from Twitch API
- Displays the token (you can add it to your `.env` if needed)

---

### 3. test-connection
**Purpose**: Test environment variables are loaded correctly

**Usage**:
```bash
cd backend/chat-ingestion/tools/test-connection
go run main.go
```

**What it does**:
- Loads `config/.env` file
- Verifies Twitch credentials are present
- Shows first 10 characters of Client ID

---

### 4. view-analysis
**Purpose**: View spam analysis results from Firestore

**Usage**:
```bash
cd backend/chat-ingestion/tools/view-analysis
go run main.go
```

**What it does**:
- Connects to Firestore
- Queries messages with spam analysis
- Shows spam vs clean messages with confidence scores

---

## Why are these in separate subdirectories?

Each tool has its own `main()` function and must be in its own directory to avoid conflicts. This is a Go requirement for organizing multiple executable commands.

**Note**: All tool files have the `//go:build ignore` directive, which tells the Go compiler to skip them during normal builds. To run a tool, use `go run main.go` directly from within the tool's directory.

## Requirements

All tools require:
- `config/.env` file with proper credentials
- Google Cloud authentication (run `gcloud auth application-default login`)
- Go modules initialized (run `go mod tidy` in the tools directory)

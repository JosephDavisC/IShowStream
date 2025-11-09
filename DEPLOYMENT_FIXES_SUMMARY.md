# Deployment Fixes Summary

## Issues Fixed ✅

### 1. History.js API URL Issue
**Problem**: History component was hardcoded to use `http://localhost:8082` instead of the Cloud Run API URL.

**Fix**: Updated `History.js` to use the same API URL detection logic as `Dashboard.js`, which:
- Checks runtime config first (from `config.js` injected at container startup)
- Falls back to environment variables
- Auto-detects Cloud Run API URL based on hostname pattern
- Falls back to localhost for local development

### 2. updateChannel 500 Error
**Problem**: The endpoint was trying to write to a local `.env` file that doesn't exist in Cloud Run containers.

**Fix**: Updated `updateChannel` function in `dashboard-api/main.go` to:
- Store channel configuration in Firestore (`config/twitch_channel` collection)
- Still try to update local `.env` file if it exists (for local development)
- Return success response with message about Firestore storage

### 3. Database Cleanup Script
**Created**: `cleanup-messages.sh` script to clean up old messages from Firestore.

## Next Steps

### 1. Rebuild and Redeploy Frontend
The `History.js` fix needs to be deployed:

```bash
cd frontend/dashboard
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend
gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "REACT_APP_API_URL=https://dashboard-api-234sus25va-uc.a.run.app,REACT_APP_WS_URL=wss://dashboard-api-234sus25va-uc.a.run.app/ws"
```

### 2. Redeploy Dashboard API
The `updateChannel` fix needs to be deployed:

```bash
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=streamsense-476705,CORS_ALLOW_ALL=true
```

### 3. Clean Up Old Messages
You have 11,702 messages in the database. To clean up old messages:

**Dry run (see what would be deleted, no actual deletion):**
```bash
./cleanup-messages.sh 7 true
```

**Actually delete messages older than 7 days:**
```bash
./cleanup-messages.sh 7 false
```

**Keep last 30 days, delete older:**
```bash
./cleanup-messages.sh 30 false
```

**Keep last 1 day only (aggressive cleanup):**
```bash
./cleanup-messages.sh 1 false
```

## WebSocket Disconnection Issue

The WebSocket disconnections are likely due to:
1. Cloud Run timeout limits (requests timeout after 60 minutes, but WebSockets might have shorter limits)
2. Network issues between frontend and backend
3. Backend service restarts

**Solutions**:
- The WebSocket reconnection logic is already implemented in `Dashboard.js`
- Consider using Cloud Run's WebSocket support (requires Cloud Run 2nd gen)
- Or use a separate WebSocket service that's always running

## Current Status

✅ **Fixed**:
- CORS configuration
- API URL detection in Dashboard
- API URL detection in History (code updated, needs deployment)
- updateChannel endpoint (code updated, needs deployment)
- Database cleanup script created

⏳ **Pending Deployment**:
- Frontend with History.js fix
- Backend API with updateChannel fix

🔧 **Optional Improvements**:
- WebSocket connection stability
- Message cleanup automation (cron job)

## Quick Deploy Commands

### Deploy Everything:
```bash
# 1. Deploy API
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=streamsense-476705,CORS_ALLOW_ALL=true

# 2. Get API URL
API_URL=$(gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)' | sed 's:/*$::')
WS_URL="${API_URL/https/wss}/ws"

# 3. Build and deploy frontend
cd ../../frontend/dashboard
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend
gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}"
```


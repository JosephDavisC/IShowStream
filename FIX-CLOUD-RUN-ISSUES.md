# Fixing Cloud Run Issues - StreamSense

## Issues Identified

### 1. Missing Streamer Logo
**Problem:** The Twitch streamer profile picture isn't displaying on the dashboard.

**Root Cause:** The `dashboard-api` service needs Twitch API credentials (`TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`) to fetch profile pictures, but these environment variables aren't set in Cloud Run.

### 2. No Messages Coming Through
**Problem:** The dashboard shows old cached messages but doesn't receive new messages in real-time.

**Root Cause:** The `chat-ingestion` service was a pure Twitch IRC listener without an HTTP server. Cloud Run requires services to handle HTTP requests and respond to health checks. Services without HTTP traffic get shut down after ~60 seconds.

## Solutions Implemented

### Fix 1: Added HTTP Server to chat-ingestion
Modified `backend/chat-ingestion/main.go` to include:
- HTTP server listening on Cloud Run's `PORT` environment variable
- `/health` endpoint for health checks (returns connection status)
- `/stats` endpoint to monitor message ingestion
- Atomic operations for thread-safe message counting
- Graceful shutdown handling

**Changes:**
- Added `net/http`, `encoding/json`, `sync/atomic` imports
- Created `healthCheck()` and `statsHandler()` HTTP handlers
- Added HTTP server startup in main function
- Updated message counter to use atomic operations
- Added connection status tracking with `atomic.Bool`

### Fix 2: Environment Variables Script
Created `update-cloud-run-env.sh` to add missing Twitch API credentials to Cloud Run services.

## Deployment Steps

### Step 1: Update Environment Variables

Run the script to add Twitch API credentials to your Cloud Run services:

```bash
./update-cloud-run-env.sh
```

This will add:
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_CHANNEL`
- `GOOGLE_CLOUD_PROJECT`

### Step 2: Redeploy chat-ingestion Service

The chat-ingestion code has been updated. You need to rebuild and redeploy it to Cloud Run.

#### Option A: Using gcloud CLI

```bash
# Navigate to chat-ingestion directory
cd backend/chat-ingestion

# Build and deploy to Cloud Run
gcloud run deploy chat-ingestion \
  --source . \
  --region=us-central1 \
  --project=streamsense-hackathon \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=streamsense-hackathon,TWITCH_CHANNEL=s0mcs" \
  --timeout=3600 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=1 \
  --max-instances=1
```

**Important flags:**
- `--timeout=3600`: Allows the service to run for 1 hour without requests
- `--min-instances=1`: Keeps at least 1 instance always running
- `--max-instances=1`: Limits to 1 instance (we only need one listener)
- `--cpu=1` and `--memory=512Mi`: Sufficient resources for a single IRC connection

#### Option B: Using Docker and Cloud Build

```bash
# Navigate to chat-ingestion directory
cd backend/chat-ingestion

# Build the container
docker build -t gcr.io/streamsense-hackathon/chat-ingestion:latest .

# Push to Google Container Registry
docker push gcr.io/streamsense-hackathon/chat-ingestion:latest

# Deploy to Cloud Run
gcloud run deploy chat-ingestion \
  --image=gcr.io/streamsense-hackathon/chat-ingestion:latest \
  --region=us-central1 \
  --project=streamsense-hackathon \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=streamsense-hackathon,TWITCH_CHANNEL=s0mcs" \
  --timeout=3600 \
  --min-instances=1 \
  --max-instances=1
```

### Step 3: Verify the Deployment

#### Check chat-ingestion health:
```bash
# Get the service URL
CHAT_INGESTION_URL=$(gcloud run services describe chat-ingestion \
  --region=us-central1 \
  --project=streamsense-hackathon \
  --format='value(status.url)')

# Check health endpoint
curl "$CHAT_INGESTION_URL/health"

# Check stats endpoint
curl "$CHAT_INGESTION_URL/stats"
```

Expected health check response:
```json
{
  "status": "healthy",
  "twitch_connected": true,
  "firestore_healthy": true,
  "messages_ingested": 1234,
  "uptime_seconds": 300
}
```

#### Check Cloud Run logs:
```bash
gcloud logs tail chat-ingestion \
  --region=us-central1 \
  --project=streamsense-hackathon \
  --limit=50
```

Look for:
- `✅ Connected to Firestore`
- `✅ Connected to Twitch IRC`
- `🎮 Joined channel: s0mcs`
- `📡 Listening for messages...`
- `🌐 HTTP server listening on port 8080`
- Message logs: `[s0mcs] username: message text`

### Step 4: Test the Dashboard

1. Open your dashboard: https://ishowstream-234sus25va-uc.a.run.app/dashboard
2. Wait 10-15 seconds for data to populate
3. Verify:
   - **Streamer logo appears** at the top (s0m's Twitch profile picture)
   - **Recent messages section shows new messages** in real-time
   - **Stats update** every 10 seconds
   - **AI Insights section** shows analysis

## Cost Considerations

**⚠️ WARNING:** Setting `--min-instances=1` on chat-ingestion keeps it running 24/7, which will incur continuous costs.

### Cost Optimization Options:

#### Option 1: Run Only When Streaming
Manually start/stop the service when needed:

```bash
# Start: Set min instances to 1
gcloud run services update chat-ingestion \
  --min-instances=1 \
  --region=us-central1

# Stop: Set min instances to 0
gcloud run services update chat-ingestion \
  --min-instances=0 \
  --region=us-central1
```

#### Option 2: Scheduled Hours
Use Cloud Scheduler to start/stop at specific times:

```bash
# Start at 6 PM daily
gcloud scheduler jobs create http start-chat-ingestion \
  --schedule="0 18 * * *" \
  --uri="https://cloudscheduler.googleapis.com/v1/projects/streamsense-hackathon/locations/us-central1/jobs/start-chat-ingestion:run" \
  --http-method=POST

# Stop at 2 AM daily
gcloud scheduler jobs create http stop-chat-ingestion \
  --schedule="0 2 * * *" \
  --uri="https://cloudscheduler.googleapis.com/v1/projects/streamsense-hackathon/locations/us-central1/jobs/stop-chat-ingestion:run" \
  --http-method=POST
```

#### Option 3: Move to Different Platform
For a long-running listener, consider:
- **Compute Engine** (cheaper for always-on workloads)
- **GKE Autopilot** (Kubernetes, more control)
- **Cloud Run Jobs** (for batch processing, but not ideal for realtime)

## Troubleshooting

### Issue: Service still shows old messages
**Solution:** Clear Firestore cache or wait 10 seconds for polling interval

### Issue: `twitch_connected: false` in health check
**Possible causes:**
- Twitch IRC is down
- Network connectivity issues
- Channel name is invalid

**Check logs:**
```bash
gcloud logs tail chat-ingestion --region=us-central1 | grep -i "twitch\|error"
```

### Issue: `firestore_healthy: false`
**Possible causes:**
- Missing `GOOGLE_CLOUD_PROJECT` environment variable
- Firestore API not enabled
- Service account permissions incorrect

**Fix permissions:**
```bash
gcloud projects add-iam-policy-binding streamsense-hackathon \
  --member="serviceAccount:$(gcloud run services describe chat-ingestion --region=us-central1 --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/datastore.user"
```

### Issue: Logo still not showing
**Solution:** The `update-cloud-run-env.sh` script needs to be run AND the dashboard-api needs to redeploy. Try:

```bash
# Force redeploy of dashboard-api (no code changes, just env vars)
gcloud run services update dashboard-api \
  --region=us-central1 \
  --update-env-vars="TWITCH_CLIENT_ID=iq2kpfd9ttf58nrpbwwwj2bawc1hm5,TWITCH_CLIENT_SECRET=hixbq3zc0p6sire2lp6weim2qjoc6w"
```

## Testing Locally

Before deploying, test locally:

```bash
# Terminal 1: Start chat-ingestion
cd backend/chat-ingestion
export GOOGLE_CLOUD_PROJECT=streamsense-hackathon
export TWITCH_CHANNEL=s0mcs
export PORT=8080
go run main.go

# Terminal 2: Check health
curl http://localhost:8080/health
curl http://localhost:8080/stats
```

## Summary

After completing these steps:
1. ✅ Chat-ingestion service stays alive on Cloud Run
2. ✅ Messages flow from Twitch → Firestore → Dashboard in real-time
3. ✅ Streamer logo displays correctly
4. ✅ Health monitoring available via `/health` endpoint
5. ✅ Stats monitoring available via `/stats` endpoint

Your StreamSense dashboard should now work perfectly on Cloud Run! 🎉

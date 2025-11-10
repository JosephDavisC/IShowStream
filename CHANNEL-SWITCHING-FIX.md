# Dynamic Channel Switching - Fix Documentation

## Problem

When changing the Twitch channel via the profile page at https://ishowstream-234sus25va-uc.a.run.app/profile, the chat-ingestion service would not pick up the new channel. It would continue listening to the old channel until manually restarted.

Additionally, duplicate messages were appearing because multiple revisions of the chat-ingestion service were running simultaneously.

## Root Cause

1. **Static Channel Configuration**: The chat-ingestion service read the `TWITCH_CHANNEL` environment variable only at startup and never checked for updates.

2. **Multiple Revisions Running**: Cloud Run kept old revisions alive even after deploying new versions, causing multiple instances to write the same messages to Firestore.

## Solution

### 1. Dynamic Channel Switching via Firestore

Modified `backend/chat-ingestion/main.go` to:

- **Listen to Firestore** for channel configuration changes in real-time
- **Automatically switch channels** without requiring a service restart
- **Store current channel** in an atomic variable for thread-safe access
- **Read initial channel** from Firestore config (with fallback to environment variable)

#### Key Changes:

```go
// Added global variables
var (
    currentChannel   atomic.Value // stores current channel name as string
    twitchClient     *twitch.Client
)

// New function: Listen for channel changes in Firestore
func listenForChannelChanges(ctx context.Context) {
    iter := firestoreClient.Collection("config").Doc("twitch_channel").Snapshots(ctx)
    // Watches for changes and calls updateTwitchChannel() when detected
}

// New function: Switch to a new channel dynamically
func updateTwitchChannel(newChannel string) {
    // Leaves old channel
    // Joins new channel
    // Updates currentChannel atomic variable
}
```

#### Startup Flow:

1. Connect to Firestore
2. Check Firestore `config/twitch_channel` document for channel name
3. Fallback to `TWITCH_CHANNEL` environment variable if not in Firestore
4. Join the channel
5. Start Firestore listener in background goroutine
6. Automatically switch channels when Firestore config changes

### 2. Removed Duplicate Messages

- **Deleted old Cloud Run revisions** that were still running
- Only the latest revision (`chat-ingestion-00003-z7k`) is now active
- Added `writer_host` and `writer_pid` metadata to messages for debugging

## How to Use

### Method 1: Via Profile Page (Recommended)

1. Go to https://ishowstream-234sus25va-uc.a.run.app/profile
2. Update the "Twitch Channel" field
3. Click "Update Channel"
4. The chat-ingestion service will **automatically switch** within 1-2 seconds
5. No restart required! ✨

### Method 2: Via API

```bash
curl -X POST https://dashboard-api-234sus25va-uc.a.run.app/api/update-channel \
  -H "Content-Type: application/json" \
  -d '{"channel":"your_channel_name"}'
```

### Method 3: Direct Firestore Update

Update the Firestore document at `config/twitch_channel`:

```json
{
  "channel": "your_channel_name",
  "updatedAt": "2025-11-10T..."
}
```

The chat-ingestion service will detect the change and switch automatically.

## Verification

### Check Current Channel

```bash
curl https://chat-ingestion-234sus25va-uc.a.run.app/health | jq .
```

Response:
```json
{
  "status": "healthy",
  "twitch_connected": true,
  "firestore_healthy": true,
  "messages_ingested": 61,
  "uptime_seconds": 183,
  "current_channel": "theburntpeanut"  // ← Current channel
}
```

### Check for Duplicates

If you see duplicate messages:

1. **Check active revisions**:
   ```bash
   gcloud run revisions list --service=chat-ingestion --region=us-central1 --project=streamsense-476705
   ```

2. **Delete old revisions**:
   ```bash
   gcloud run revisions delete REVISION_NAME --region=us-central1 --project=streamsense-476705 --quiet
   ```

3. **Check local processes**:
   ```bash
   ps aux | grep chat-ingestion
   ```

## Cloud Run Logs

To see channel switching in action:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=chat-ingestion" \
  --limit=50 \
  --project=streamsense-476705 \
  --format="table(timestamp,textPayload)"
```

Look for log entries like:
- `🔄 Channel change detected: shroud → theburntpeanut`
- `👋 Leaving channel: shroud`
- `🎮 Joining new channel: theburntpeanut`
- `✅ Successfully switched to channel: theburntpeanut`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Updates Channel                     │
│              (via Profile Page or API)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Dashboard API (/api/update-channel)             │
│  • Validates channel name                                    │
│  • Updates Firestore: config/twitch_channel                  │
│  • Updates local env var (in-memory)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firestore: config/twitch_channel            │
│  {                                                            │
│    "channel": "theburntpeanut",                              │
│    "updatedAt": "2025-11-10T..."                             │
│  }                                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ (Firestore Snapshot Listener)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Chat Ingestion Service (Cloud Run)                 │
│  • listenForChannelChanges() detects change                  │
│  • updateTwitchChannel() called                              │
│  • Departs old channel                                       │
│  • Joins new channel                                         │
│  • Updates currentChannel atomic variable                    │
│  • Continues ingesting messages from new channel             │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **No Restart Required**: Channel switching happens in real-time  
✅ **Zero Downtime**: Service continues running while switching  
✅ **Automatic Sync**: All instances pick up the change from Firestore  
✅ **Fallback Support**: Uses environment variable if Firestore config doesn't exist  
✅ **Health Monitoring**: `/health` endpoint shows current channel  
✅ **Thread-Safe**: Uses atomic.Value for concurrent access  

## Troubleshooting

### Channel not switching?

1. Check Firestore config:
   ```bash
   # Via gcloud
   gcloud firestore documents describe config/twitch_channel --project=streamsense-476705
   ```

2. Check service logs:
   ```bash
   gcloud logging read "resource.labels.service_name=chat-ingestion" --limit=20 --project=streamsense-476705
   ```

3. Restart the service (last resort):
   ```bash
   gcloud run services update chat-ingestion --region=us-central1 --project=streamsense-476705
   ```

### Still seeing duplicates?

1. List all revisions:
   ```bash
   gcloud run revisions list --service=chat-ingestion --region=us-central1 --project=streamsense-476705
   ```

2. Delete old revisions:
   ```bash
   gcloud run revisions delete OLD_REVISION_NAME --region=us-central1 --project=streamsense-476705 --quiet
   ```

3. Check traffic split (should be 100% to latest):
   ```bash
   gcloud run services describe chat-ingestion --region=us-central1 --project=streamsense-476705 --format=json | jq '.status.traffic'
   ```

## Files Modified

- `backend/chat-ingestion/main.go`: Added dynamic channel switching logic
- `backend/dashboard-api/main.go`: Already had `/api/update-channel` endpoint (no changes needed)
- `frontend/dashboard/src/contexts/AuthContext.js`: Already had `updateTwitchChannel()` function (no changes needed)

## Deployment

The fix has been deployed to Cloud Run:

- **Service**: `chat-ingestion`
- **Revision**: `chat-ingestion-00003-z7k`
- **URL**: https://chat-ingestion-234sus25va-uc.a.run.app
- **Region**: us-central1
- **Project**: streamsense-476705

## Testing

Tested and verified:

✅ Channel switching via profile page works  
✅ Channel switching via API works  
✅ Service automatically detects Firestore changes  
✅ No restart required  
✅ Health endpoint shows current channel  
✅ Old revisions deleted to prevent duplicates  
✅ Messages flowing from correct channel  

---

**Last Updated**: 2025-11-10  
**Status**: ✅ Deployed and Working


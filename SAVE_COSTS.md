# How to Save Costs on Google Cloud Run

## Quick Answer

**Good news!** Cloud Run **automatically scales to zero** when there's no traffic, so you're only charged when:
- Requests are being processed
- Services are handling traffic

**However**, if you want to stop API calls (like Gemini API) overnight, pause the `chat-ingestion` service since that's what makes the API calls.

## Option 1: Pause Chat Ingestion (Recommended - Stops API Calls)

### Stop API Calls Overnight
```bash
./pause-chat-ingestion.sh
```

This will:
- Stop the chat-ingestion service (which makes API calls)
- Prevent API usage (Gemini API calls will stop)
- Save on API costs
- Dashboard and API services remain available (just no chat processing)

### Resume Chat Ingestion
```bash
./resume-chat-ingestion.sh
```

This will:
- Restart the chat-ingestion service
- Resume API calls and chat processing

**This is the best option** because it stops API usage without affecting the dashboard.

## Option 2: Set Minimum Instances to 0 (Default)

Cloud Run already sets `min-instances` to 0 by default, which means:
- Services scale to zero when idle
- No charges when no traffic
- Services wake up automatically when requests arrive (cold start ~1-2 seconds)

**You're already set up this way!** No action needed.

## Option 3: Schedule Automatic Stop/Start

### Using Local Cron (Simple)
```bash
# Edit crontab
crontab -e

# Add these lines (adjust times to your timezone):
# Stop at 2 AM daily
0 2 * * * cd /path/to/streamsense && ./stop-services.sh >> /tmp/stop-services.log 2>&1

# Start at 8 AM daily  
0 8 * * * cd /path/to/streamsense && ./start-services.sh >> /tmp/start-services.log 2>&1
```

### Using Cloud Scheduler (Advanced)
Requires setting up Cloud Functions or using App Engine. More complex but runs in the cloud.

## Option 4: Delete Services (Not Recommended)

You can delete services completely, but you'll need to redeploy them:
```bash
# Delete services
gcloud run services delete dashboard-api --region us-central1
gcloud run services delete ishowstream --region us-central1
gcloud run services delete chat-ingestion --region us-central1

# Redeploy when needed using DEPLOY_NOW.sh
```

## Understanding Cloud Run Billing

### What You're Charged For:
1. **CPU/Memory**: Only when requests are being processed
2. **Requests**: $0.40 per million requests
3. **Networking**: Egress traffic

### What You're NOT Charged For:
- Idle time (when scaled to zero)
- Storage (Firestore has its own pricing)
- API calls (Gemini API has its own pricing)

### Cost Optimization Tips:

1. **Keep min-instances at 0** (default) ✅
   - Services automatically scale to zero when idle
   - Only pay when handling requests

2. **Set request timeout** (already configured)
   - Limits how long requests can run
   - Prevents runaway costs

3. **Monitor usage**
   ```bash
   # Check service status
   gcloud run services list --region us-central1
   
   # Check billing
   # Go to: https://console.cloud.google.com/billing
   ```

4. **Set up billing alerts**
   - Go to: https://console.cloud.google.com/billing
   - Set up budget alerts to get notified of spending

## Current Configuration

Your services are configured with:
- `min-instances: 0` (scale to zero when idle) ✅
- `max-instances: 10` (auto-scale based on traffic)
- Automatic scaling based on requests

**You're already optimized!** Services will automatically scale to zero when not in use.

## Recommended: Just Let Cloud Run Auto-Scale

Since Cloud Run automatically scales to zero, you don't need to manually stop services. They will:
- Scale to 0 when idle (no traffic for a few minutes)
- Wake up automatically when requests arrive
- Only charge for actual usage

**No action needed unless you want to ensure services are stopped during specific hours.**

## Quick Commands

```bash
# Check service status
gcloud run services list --region us-central1

# Pause chat-ingestion (stops API calls) - RECOMMENDED
./pause-chat-ingestion.sh

# Resume chat-ingestion (starts API calls)
./resume-chat-ingestion.sh

# Ensure all services scale to zero (already default)
./stop-services.sh

# Check current service configuration
gcloud run services describe chat-ingestion --region us-central1 --format="yaml(spec.template.metadata.annotations)"
```

## Recommended Workflow for Overnight

**To stop API calls and save costs overnight:**

```bash
# Before bed (or set up a cron job)
./pause-chat-ingestion.sh

# In the morning (or set up a cron job)
./resume-chat-ingestion.sh
```

This will:
- ✅ Stop API calls (Gemini API)
- ✅ Stop chat processing
- ✅ Keep dashboard available (but no new data)
- ✅ Cloud Run automatically scales to zero (no compute charges)


# Cloud Run Deployment - Fix API URL Issue

## Current Issue

The frontend is trying to connect to `http://localhost:8082` instead of your Cloud Run API service. This happens because:
1. The code was updated but not redeployed
2. Environment variables aren't set in Cloud Run
3. The API URL needs to be configured

## Solution: Set Environment Variables in Cloud Run

You need to set the API URL when deploying the frontend service. Here are the steps:

### Step 1: Find Your Dashboard API Service URL

First, get the URL of your dashboard-api service:

```bash
gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)'
```

Or check in the Cloud Console:
- Go to Cloud Run → dashboard-api service
- Copy the Service URL

### Step 2: Deploy Frontend with Environment Variables

Deploy the frontend with the API URL environment variable:

```bash
# Get your dashboard API URL (replace with your actual URL)
DASHBOARD_API_URL="https://dashboard-api-xxxxx-uc.a.run.app"
WS_URL="${DASHBOARD_API_URL/https/wss}/ws"

# Build and deploy
cd frontend/dashboard
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend

gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=${DASHBOARD_API_URL},REACT_APP_WS_URL=${WS_URL}
```

### Step 3: Alternative - Update Existing Service

If the service is already deployed, update it:

```bash
# Get your dashboard API URL
DASHBOARD_API_URL="https://dashboard-api-xxxxx-uc.a.run.app"
WS_URL="${DASHBOARD_API_URL/https/wss}/ws"

# Update the service with environment variables
gcloud run services update ishowstream \
  --region us-central1 \
  --update-env-vars REACT_APP_API_URL=${DASHBOARD_API_URL},REACT_APP_WS_URL=${WS_URL}
```

**Note**: If you update env vars, you still need to rebuild and redeploy the frontend with the new code that uses these variables.

## Auto-Detection (Fallback)

The code now includes auto-detection that will try to find the API service:
- If running on `ishowstream-xxx.run.app`, it tries `dashboard-api-xxx.run.app`
- This only works if service names follow this pattern

## Quick Fix: Rebuild and Redeploy

1. **Commit and push your code changes**:
   ```bash
   git add .
   git commit -m "Fix API URL configuration for Cloud Run"
   git push
   ```

2. **If using Cloud Build triggers**, the new code will deploy automatically

3. **If deploying manually**, rebuild and redeploy:
   ```bash
   # Build
   gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend ./frontend/dashboard
   
   # Deploy with environment variables
   gcloud run deploy ishowstream \
     --image gcr.io/streamsense-476705/ishowstream-frontend \
     --region us-central1 \
     --set-env-vars REACT_APP_API_URL=https://YOUR-API-URL,REACT_APP_WS_URL=wss://YOUR-API-URL/ws
   ```

## Verify It's Working

After deployment:
1. Open your Cloud Run frontend URL
2. Open browser DevTools → Console
3. Look for: `🔧 Dashboard API Configuration:`
4. Verify `API_URL` is NOT `localhost:8082`
5. Check that API calls are going to your Cloud Run API URL

## What Was Fixed

1. ✅ Updated `Dashboard.js` to auto-detect API URL for Cloud Run
2. ✅ Added support for runtime configuration via `entrypoint.sh`
3. ✅ Added support for environment variables
4. ✅ Added fallback to auto-detect API service URL

## Next Steps

1. **Find your dashboard-api service URL**
2. **Set environment variables in Cloud Run** (or use auto-detection)
3. **Rebuild and redeploy the frontend**
4. **Verify it's working** by checking browser console

The code will now automatically detect the API URL when running on Cloud Run, but it's better to set it explicitly via environment variables.


# Deploy Frontend to Cloud Run - Quick Guide

## The Problem

You've pushed code to GitHub, but Cloud Run is still running the OLD build with hardcoded `localhost:8082`. 

**Pushing to GitHub doesn't automatically deploy to Cloud Run** - you need to either:
1. Have a Cloud Build trigger set up (auto-deploy on push)
2. Manually rebuild and redeploy

## Solution: Manual Deploy

### Step 1: Get Your Dashboard API URL

First, find your dashboard-api service URL:

```bash
gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)'
```

Or check in Cloud Console:
- Go to Cloud Run → dashboard-api service
- Copy the Service URL (e.g., `https://dashboard-api-xxxxx-uc.a.run.app`)

### Step 2: Build and Deploy Frontend

```bash
# Navigate to frontend directory
cd frontend/dashboard

# Build the Docker image
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend

# Deploy to Cloud Run (replace YOUR_API_URL with your actual API URL)
gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=https://YOUR-API-URL.run.app,REACT_APP_WS_URL=wss://YOUR-API-URL.run.app/ws
```

### Step 3: Verify Deployment

After deployment:
1. Wait 1-2 minutes for the new revision to be ready
2. Open your Cloud Run frontend URL
3. Open browser DevTools → Console
4. Look for: `🔧 Dashboard API Configuration:`
5. Verify `API_URL` is NOT `localhost:8082`
6. Check that API calls succeed

## Alternative: Quick Deploy Script

Create a script to make this easier:

```bash
#!/bin/bash
# deploy-frontend.sh

PROJECT_ID="streamsense-476705"
REGION="us-central1"
SERVICE_NAME="ishowstream"

# Get API URL
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)')
WS_URL="${API_URL/https/wss}/ws"

echo "🚀 Deploying frontend..."
echo "   API URL: ${API_URL}"
echo "   WS URL: ${WS_URL}"

# Build
echo "📦 Building Docker image..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend ./frontend/dashboard

# Deploy
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}

echo "✅ Deployment complete!"
echo "   Frontend URL: $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')"
```

## Why This Happens

React apps are built at **build time**, not runtime. When you push code to GitHub:
- ✅ Code is in the repository
- ❌ Cloud Run is still running the OLD built version
- ❌ You need to rebuild the Docker image and redeploy

## Auto-Deployment Setup (Optional)

To automatically deploy on push, set up a Cloud Build trigger:

1. Go to Cloud Build → Triggers
2. Create a new trigger
3. Connect to your GitHub repository
4. Set branch pattern: `^master$` (or your main branch)
5. Set build configuration: `frontend/dashboard/Dockerfile`
6. Set service: `ishowstream`
7. Set region: `us-central1`

Then every push to master will automatically rebuild and deploy.

## What Changed in the Code

The new code:
- ✅ Auto-detects API URL for Cloud Run
- ✅ Supports environment variables
- ✅ Supports runtime configuration
- ✅ Falls back to localhost for development

But Cloud Run needs to be running the NEW code for this to work!


# Immediate Fix - Deploy Frontend with Correct API URL

## The Problem

1. ✅ **Code is fixed** - API URL auto-detection is in the code
2. ❌ **Cloud Run is running OLD build** - Still has hardcoded `localhost:8082`
3. ❌ **Cloud Build trigger not firing** - Trigger watches `main` branch, but you're on `master`
4. ❌ **No dashboard-api service** - Frontend needs the API service to work

## Quick Fix: Manual Deploy

### Option 1: Use the Deployment Script (Easiest)

```bash
# Run the deployment script
./MANUAL_DEPLOY_NOW.sh
```

This script will:
1. Check if dashboard-api exists (deploy it if needed)
2. Get the API URL
3. Build the frontend
4. Deploy with correct environment variables

### Option 2: Manual Steps

#### Step 1: Deploy Dashboard API (if not exists)

```bash
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=streamsense-476705,PORT=8082,CORS_ALLOW_ALL=true
```

#### Step 2: Get API URL

```bash
API_URL=$(gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)')
echo "API URL: $API_URL"
WS_URL="${API_URL/https/wss}/ws"
echo "WS URL: $WS_URL"
```

#### Step 3: Build and Deploy Frontend

```bash
cd frontend/dashboard

# Build
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend

# Deploy with API URL
gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}
```

## Fix Cloud Build Trigger (For Future)

The trigger is set to watch `^main$` but you're on `master`. Fix it:

### Option A: Change Trigger to Watch `master`

```bash
gcloud builds triggers update rmgpgab-ishowstream-us-central1-JosephDavisC-streamsense--maejx \
  --branch-pattern="^master$"
```

### Option B: Push to `main` Branch

```bash
git checkout -b main
git push origin main
```

### Option C: Update Trigger Build Context

The trigger builds from root, but Dockerfile is in `frontend/dashboard/`. Update the trigger to build from the correct directory.

## Verify It's Working

After deployment:
1. Wait 1-2 minutes
2. Open: https://ishowstream-234sus25va-uc.a.run.app
3. Open browser DevTools → Console
4. Look for: `🔧 Dashboard API Configuration:`
5. Verify `API_URL` is NOT `localhost:8082`
6. Check that API calls succeed

## Why Waiting Doesn't Help

**You don't need to wait 5 minutes** - the issue is:
- ❌ Code is pushed to GitHub ✅
- ❌ But Cloud Build trigger isn't firing (branch mismatch)
- ❌ Cloud Run is still running the OLD build
- ❌ You need to manually rebuild and redeploy

## Summary

**Do this NOW:**
1. Run `./MANUAL_DEPLOY_NOW.sh` (or follow manual steps above)
2. This will deploy dashboard-api (if needed)
3. Then deploy frontend with correct API URL
4. Verify it's working

**For future:** Fix the Cloud Build trigger to watch `master` branch or push to `main` branch.


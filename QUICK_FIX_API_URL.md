# Quick Fix: API URL Issue on Cloud Run

## The Problem

Your frontend is trying to connect to `http://localhost:8082` instead of your Cloud Run API service. This is because:
1. The old code had hardcoded `localhost:8082`
2. The new code hasn't been deployed yet
3. Environment variables aren't set in Cloud Run

## The Solution

I've updated the code to:
1. ✅ Auto-detect API URL for Cloud Run
2. ✅ Support environment variables
3. ✅ Support runtime configuration

## What You Need to Do

### Option 1: Just Rebuild and Redeploy (Auto-Detection)

The code now auto-detects the API URL. If your services follow the naming pattern:
- Frontend: `ishowstream-xxx.run.app`
- API: `dashboard-api-xxx.run.app`

It will automatically find the API service. Just rebuild and redeploy:

```bash
# Commit and push the changes
git add .
git commit -m "Fix API URL auto-detection for Cloud Run"
git push

# If using Cloud Build triggers, it will deploy automatically
# Otherwise, rebuild and redeploy manually
```

### Option 2: Set Environment Variables (Recommended)

For more reliability, set the API URL as an environment variable:

1. **Find your dashboard-api service URL**:
   ```bash
   gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)'
   ```

2. **Update the frontend service with environment variables**:
   ```bash
   # Replace with your actual API URL
   DASHBOARD_API_URL="https://dashboard-api-xxxxx-uc.a.run.app"
   WS_URL="${DASHBOARD_API_URL/https/wss}/ws"
   
   gcloud run services update ishowstream \
     --region us-central1 \
     --update-env-vars REACT_APP_API_URL=${DASHBOARD_API_URL},REACT_APP_WS_URL=${WS_URL}
   ```

3. **Rebuild and redeploy the frontend** (so it uses the new code):
   ```bash
   cd frontend/dashboard
   gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend
   
   gcloud run deploy ishowstream \
     --image gcr.io/streamsense-476705/ishowstream-frontend \
     --region us-central1
   ```

## Verify It's Working

After deployment:
1. Open your Cloud Run frontend URL
2. Open browser DevTools → Console
3. Look for: `🔧 Dashboard API Configuration:`
4. Verify `API_URL` is NOT `localhost:8082`
5. Check that API calls succeed (no CORS errors)

## Files Updated

- ✅ `frontend/dashboard/src/components/Dashboard.js` - Auto-detects API URL
- ✅ `frontend/dashboard/src/contexts/AuthContext.js` - Uses same API URL detection
- ✅ `frontend/dashboard/Dockerfile` - Added entrypoint script support
- ✅ `frontend/dashboard/entrypoint.sh` - Runtime config injection
- ✅ `frontend/dashboard/public/config.js` - Runtime config template
- ✅ `frontend/dashboard/public/index.html` - Loads config.js

## Next Steps

1. **Commit and push the code changes**
2. **Rebuild and redeploy** (or wait for Cloud Build trigger)
3. **Set environment variables** (optional, but recommended)
4. **Verify it's working** by checking browser console

The code will now automatically detect the API URL when running on Cloud Run!


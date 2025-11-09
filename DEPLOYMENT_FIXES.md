# Deployment Fixes Applied

## Issue 1: Build Failure - Go Version Mismatch

### Problem
- Dependencies require Go 1.24.0
- Dockerfile was using Go 1.23
- Build failed with: "go: updates to go.mod needed; to update it: go mod tidy"

### Solution
1. Updated `go.mod` to specify `go 1.24.0` (required by `cloud.google.com/go/auth@v0.17.0`)
2. Updated Dockerfile to use `golang:1.23` with `GOTOOLCHAIN=auto`
   - This allows Go to automatically download Go 1.24.0 during the build
3. Removed `go mod tidy` from Dockerfile build steps
   - Ensures go.mod/go.sum are committed correctly
   - Avoids non-deterministic builds

### Files Changed
- `backend/dashboard-api/go.mod` - Updated to `go 1.24.0`
- `backend/dashboard-api/Dockerfile` - Added `GOTOOLCHAIN=auto`, removed `go mod tidy`

## Issue 2: OAuth Timeout in Chat Ingestion

### Problem
- Firestore writes failing with: "context deadline exceeded"
- OAuth token exchange timing out after 2 seconds
- Cloud Run services need more time for initial authentication

### Solution
1. Increased timeout from 2 seconds to 10 seconds in `saveToFirestore()`
   - Allows time for OAuth token exchange
   - Accounts for network latency in Cloud Run

### Files Changed
- `backend/chat-ingestion/main.go` - Updated timeout from `2*time.Second` to `10*time.Second`

## Next Steps

1. **Deploy dashboard-api:**
   ```bash
   cd backend/dashboard-api
   gcloud run deploy dashboard-api \
     --source . \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars GOOGLE_CLOUD_PROJECT=streamsense-476705,PORT=8082,CORS_ALLOW_ALL=true
   ```

2. **Get API URL and deploy frontend:**
   ```bash
   cd ../../frontend/dashboard
   API_URL=$(gcloud run services describe dashboard-api --region us-central1 --format 'value(status.url)')
   WS_URL="${API_URL/https/wss}/ws"
   
   gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend
   
   gcloud run deploy ishowstream \
     --image gcr.io/streamsense-476705/ishowstream-frontend \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}
   ```

3. **Verify deployment:**
   - Check Cloud Run logs for any authentication errors
   - Verify API calls work from the frontend
   - Check that Firestore writes are succeeding (no more timeout errors)

## Notes

- Go 1.24.0 will be automatically downloaded during the Docker build (takes ~30 seconds)
- The OAuth timeout increase should resolve Firestore write failures
- Cloud Run services automatically use Application Default Credentials (no manual auth needed)


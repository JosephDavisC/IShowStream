#!/bin/bash

# Fixed deployment script - Deploys dashboard-api and frontend
# This fixes the Go version issue and API URL configuration

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"

echo "🚀 Starting deployment with fixes..."
echo ""

# Step 1: Deploy dashboard-api service
echo "📡 Step 1: Deploying dashboard-api service..."
echo "   (This may take 3-5 minutes for the first build)"
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PORT=8082,CORS_ALLOW_ALL=true

# Step 2: Get API URL
echo ""
echo "🔍 Step 2: Getting API URL..."
cd ../..
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)')
WS_URL="${API_URL/https/wss}/ws"

echo "   ✅ API URL: ${API_URL}"
echo "   ✅ WS URL: ${WS_URL}"
echo ""

# Step 3: Build frontend
echo "📦 Step 3: Building frontend Docker image..."
echo "   (This may take 5-10 minutes)"
cd frontend/dashboard
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend

# Step 4: Deploy frontend with API URL
echo ""
echo "🚀 Step 4: Deploying frontend to Cloud Run..."
gcloud run deploy ishowstream \
  --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}

# Step 5: Get frontend URL
FRONTEND_URL=$(gcloud run services describe ishowstream --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Summary:"
echo "   Frontend URL: ${FRONTEND_URL}"
echo "   API URL: ${API_URL}"
echo "   WS URL: ${WS_URL}"
echo ""
echo "🔍 Next steps:"
echo "   1. Wait 1-2 minutes for the new revision to be ready"
echo "   2. Open: ${FRONTEND_URL}"
echo "   3. Open browser DevTools → Console"
echo "   4. Look for: 🔧 Dashboard API Configuration:"
echo "   5. Verify API_URL is NOT localhost:8082"
echo "   6. Check that API calls succeed (no CORS errors)"


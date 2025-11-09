#!/bin/bash

# Quick deployment script - Fix API URL issue
# This will deploy dashboard-api and frontend with correct configuration

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"

echo "🚀 Starting deployment..."
echo ""

# Step 1: Deploy dashboard-api service
echo "📡 Step 1: Deploying dashboard-api service..."
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},CORS_ALLOW_ALL=true

# Step 2: Get API URL
echo ""
echo "🔍 Step 2: Getting API URL..."
cd ../..
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)')

if [ -z "$API_URL" ]; then
  echo "❌ Error: Could not get API URL. Please check that dashboard-api service exists."
  exit 1
fi

# Remove trailing slash if present
API_URL=$(echo "$API_URL" | sed 's:/*$::')
WS_URL="${API_URL/https/wss}/ws"

echo "   ✅ API URL: ${API_URL}"
echo "   ✅ WS URL: ${WS_URL}"
echo ""

# Step 3: Build frontend
echo "📦 Step 3: Building frontend Docker image..."
cd frontend/dashboard
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend

# Step 4: Deploy frontend with API URL
echo ""
echo "🚀 Step 4: Deploying frontend to Cloud Run..."
echo "   Setting environment variables:"
echo "     REACT_APP_API_URL=${API_URL}"
echo "     REACT_APP_WS_URL=${WS_URL}"
gcloud run deploy ishowstream \
  --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}"

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


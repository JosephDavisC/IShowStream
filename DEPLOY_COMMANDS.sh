#!/bin/bash

# Quick deploy commands - Copy and paste these one by one

PROJECT_ID="streamsense-476705"
REGION="us-central1"

# Step 1: Deploy dashboard-api (if it doesn't exist)
echo "Step 1: Deploying dashboard-api..."
cd backend/dashboard-api
gcloud run deploy dashboard-api \
  --source . \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PORT=8082,CORS_ALLOW_ALL=true

# Step 2: Get API URL
echo "Step 2: Getting API URL..."
cd ../..
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)')
WS_URL="${API_URL/https/wss}/ws"
echo "API URL: $API_URL"
echo "WS URL: $WS_URL"

# Step 3: Build frontend
echo "Step 3: Building frontend..."
cd frontend/dashboard
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend

# Step 4: Deploy frontend with API URL
echo "Step 4: Deploying frontend..."
gcloud run deploy ishowstream \
  --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}

echo "✅ Done! Check the browser console to verify API_URL is correct."


#!/bin/bash

# Manual Frontend Deployment Script
# This will build and deploy the frontend to Cloud Run with the correct API URL

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"
FRONTEND_SERVICE="ishowstream"

echo "🚀 Deploying Frontend to Cloud Run"
echo ""

# Step 1: Check if dashboard-api service exists
echo "📡 Checking for dashboard-api service..."
API_SERVICE_EXISTS=$(gcloud run services list --region ${REGION} --filter="metadata.name=dashboard-api" --format="value(metadata.name)" 2>/dev/null || echo "")

if [ -z "$API_SERVICE_EXISTS" ]; then
    echo "⚠️  Warning: dashboard-api service not found!"
    echo "   The frontend needs the API service to work."
    echo "   Do you want to deploy dashboard-api first? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "📦 Deploying dashboard-api..."
        cd backend/dashboard-api
        gcloud run deploy dashboard-api \
            --source . \
            --region ${REGION} \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID},PORT=8082,CORS_ALLOW_ALL=true
        cd ../..
    else
        echo "❌ Cannot proceed without API service. Exiting."
        exit 1
    fi
fi

# Step 2: Get API URL
echo "🔍 Getting dashboard-api URL..."
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)' 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo "❌ Could not find dashboard-api URL. Please deploy it first."
    exit 1
fi

WS_URL="${API_URL/https/wss}/ws"

echo "✅ Found API URL: ${API_URL}"
echo "✅ WebSocket URL: ${WS_URL}"
echo ""

# Step 3: Build frontend
echo "📦 Building frontend Docker image..."
cd frontend/dashboard
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend

# Step 4: Deploy frontend
echo "🚀 Deploying frontend to Cloud Run..."
gcloud run deploy ${FRONTEND_SERVICE} \
    --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL}

# Step 5: Get frontend URL
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "   Frontend URL: ${FRONTEND_URL}"
echo "   API URL: ${API_URL}"
echo ""
echo "🔍 Next steps:"
echo "   1. Wait 1-2 minutes for the new revision to be ready"
echo "   2. Open: ${FRONTEND_URL}"
echo "   3. Check browser console for: 🔧 Dashboard API Configuration:"
echo "   4. Verify API_URL is NOT localhost:8082"


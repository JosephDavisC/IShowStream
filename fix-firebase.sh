#!/bin/bash

# Quick fix script: Rebuild frontend with Firebase runtime config support
# Then update Cloud Run service with Firebase config

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"

echo "🔧 Fixing Firebase Configuration..."
echo ""

# Step 1: Rebuild frontend with updated firebase.js
echo "📦 Step 1: Rebuilding frontend with Firebase runtime config support..."
cd frontend/dashboard
gcloud builds submit --tag gcr.io/${PROJECT_ID}/ishowstream-frontend

# Step 2: Get API URL
echo ""
echo "🔍 Step 2: Getting API URL..."
cd ../..
API_URL=$(gcloud run services describe dashboard-api --region ${REGION} --format 'value(status.url)' | sed 's:/*$::')
WS_URL="${API_URL/https/wss}/ws"

echo "   ✅ API URL: ${API_URL}"
echo "   ✅ WS URL: ${WS_URL}"
echo ""

# Step 3: Prompt for Firebase config
echo "📋 Step 3: Firebase Configuration"
echo "   Get these values from: https://console.firebase.google.com/project/${PROJECT_ID}/settings/general"
echo "   (Scroll down to 'Your apps' section and click on the web app icon)"
echo ""
read -p "Firebase API Key: " FIREBASE_API_KEY
read -p "Firebase Auth Domain: " FIREBASE_AUTH_DOMAIN
read -p "Firebase Project ID [${PROJECT_ID}]: " FIREBASE_PROJECT_ID
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-${PROJECT_ID}}
read -p "Firebase Storage Bucket: " FIREBASE_STORAGE_BUCKET
read -p "Firebase Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
read -p "Firebase App ID: " FIREBASE_APP_ID

# Step 4: Deploy frontend with all config
echo ""
echo "🚀 Step 4: Deploying frontend with Firebase config..."
gcloud run deploy ishowstream \
  --image gcr.io/${PROJECT_ID}/ishowstream-frontend \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "REACT_APP_API_URL=${API_URL},REACT_APP_WS_URL=${WS_URL},REACT_APP_FIREBASE_API_KEY=${FIREBASE_API_KEY},REACT_APP_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN},REACT_APP_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},REACT_APP_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET},REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID},REACT_APP_FIREBASE_APP_ID=${FIREBASE_APP_ID}"

echo ""
echo "✅ Firebase configuration updated!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait 30-60 seconds for the new revision to be ready"
echo "   2. Refresh your browser"
echo "   3. Check browser console - Firebase errors should be gone"
echo ""


#!/bin/bash

# Script to update Firebase configuration in Cloud Run frontend service
# Usage: ./update-firebase-config.sh

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"
SERVICE_NAME="ishowstream"

echo "🔧 Updating Firebase configuration for Cloud Run service..."
echo ""

# Get current environment variables
echo "📋 Current environment variables:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format="value(spec.template.spec.containers[0].env)" | tr ';' '\n' | grep -E "(REACT_APP_|KEY)" || echo "   (none set)"

echo ""
echo "To update Firebase config, you need to provide the following values:"
echo "   (Get them from: https://console.firebase.google.com/project/${PROJECT_ID}/settings/general)"
echo ""
read -p "Firebase API Key: " FIREBASE_API_KEY
read -p "Firebase Auth Domain: " FIREBASE_AUTH_DOMAIN
read -p "Firebase Project ID [${PROJECT_ID}]: " FIREBASE_PROJECT_ID
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-${PROJECT_ID}}
read -p "Firebase Storage Bucket: " FIREBASE_STORAGE_BUCKET
read -p "Firebase Messaging Sender ID: " FIREBASE_MESSAGING_SENDER_ID
read -p "Firebase App ID: " FIREBASE_APP_ID

echo ""
echo "🔄 Updating Cloud Run service with Firebase config..."

# Get existing API URL and WS URL to preserve them
API_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(spec.template.spec.containers[0].env[?(@.name=="REACT_APP_API_URL")].value)' 2>/dev/null || echo "")
WS_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(spec.template.spec.containers[0].env[?(@.name=="REACT_APP_WS_URL")].value)' 2>/dev/null || echo "")

# Build environment variables string
ENV_VARS="REACT_APP_FIREBASE_API_KEY=${FIREBASE_API_KEY}"
ENV_VARS="${ENV_VARS},REACT_APP_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}"
ENV_VARS="${ENV_VARS},REACT_APP_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"
ENV_VARS="${ENV_VARS},REACT_APP_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}"
ENV_VARS="${ENV_VARS},REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}"
ENV_VARS="${ENV_VARS},REACT_APP_FIREBASE_APP_ID=${FIREBASE_APP_ID}"

# Add API URL and WS URL if they exist
if [ -n "$API_URL" ]; then
  ENV_VARS="${ENV_VARS},REACT_APP_API_URL=${API_URL}"
fi
if [ -n "$WS_URL" ]; then
  ENV_VARS="${ENV_VARS},REACT_APP_WS_URL=${WS_URL}"
fi

# Update the service
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --update-env-vars "${ENV_VARS}"

echo ""
echo "✅ Firebase configuration updated!"
echo ""
echo "📋 Next steps:"
echo "   1. Wait 30-60 seconds for the new revision to be ready"
echo "   2. Refresh your browser at: https://ishowstream-234sus25va-uc.a.run.app"
echo "   3. Check the browser console - Firebase errors should be gone"
echo ""


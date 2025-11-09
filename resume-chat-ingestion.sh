#!/bin/bash

# Script to resume chat-ingestion service
# Usage: ./resume-chat-ingestion.sh

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"
SERVICE="chat-ingestion"

echo "▶️  Resuming chat-ingestion service..."
echo ""

# Check if service exists
if ! gcloud run services describe $SERVICE --region $REGION --format="value(metadata.name)" &>/dev/null; then
  echo "⚠️  Service $SERVICE not found. It may not be deployed."
  exit 1
fi

# Restore traffic to the service
echo "📦 Restoring traffic to $SERVICE..."
gcloud run services update-traffic $SERVICE \
  --region $REGION \
  --to-latest \
  --quiet

echo ""
echo "✅ Chat-ingestion service resumed!"
echo "   - Service will start processing requests"
echo "   - API calls will resume"
echo ""


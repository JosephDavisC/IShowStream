#!/bin/bash

# Script to pause chat-ingestion service (main API consumer)
# This is the service that makes API calls, so pausing it will stop API usage
# Usage: ./pause-chat-ingestion.sh

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"
SERVICE="chat-ingestion"

echo "⏸️  Pausing chat-ingestion service to stop API calls..."
echo ""

# Check if service exists
if ! gcloud run services describe $SERVICE --region $REGION --format="value(metadata.name)" &>/dev/null; then
  echo "⚠️  Service $SERVICE not found. It may not be deployed."
  exit 1
fi

# Stop all traffic to the service
echo "📦 Stopping traffic to $SERVICE..."
gcloud run services update-traffic $SERVICE \
  --region $REGION \
  --to-revisions=LATEST=0 \
  --quiet

echo ""
echo "✅ Chat-ingestion service paused!"
echo "   - No traffic will be routed to the service"
echo "   - Service will scale to zero automatically"
echo "   - API calls will stop (no chat ingestion = no API calls)"
echo ""
echo "💡 To resume: ./resume-chat-ingestion.sh"
echo ""


#!/bin/bash

# Script to start/scale up Cloud Run services
# Usage: ./start-services.sh

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"

echo "🚀 Starting Cloud Run services..."
echo ""

# List of services to start
SERVICES=(
  "dashboard-api"
  "ishowstream"
  "chat-ingestion"
)

for service in "${SERVICES[@]}"; do
  echo "📦 Starting service: $service"
  
  # Restore traffic to latest revision (100%)
  gcloud run services update-traffic $service \
    --region $REGION \
    --to-latest \
    --quiet 2>/dev/null || echo "   ℹ️  Traffic routing may already be configured"
  
  # Ensure min-instances is 0 (auto-scale)
  gcloud run services update $service \
    --region $REGION \
    --min-instances 0 \
    --quiet
  
  echo "   ✅ $service ready (will auto-scale based on traffic)"
done

echo ""
echo "✅ All services started!"
echo "   Services are ready to handle requests"
echo "   Cloud Run will automatically scale based on traffic"
echo ""


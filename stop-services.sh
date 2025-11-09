#!/bin/bash

# Script to ensure Cloud Run services scale to zero (save costs)
# Note: Cloud Run already scales to zero automatically when idle
# This script ensures min-instances is 0 for all services
# Usage: ./stop-services.sh

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"

echo "🛑 Ensuring Cloud Run services are configured to scale to zero..."
echo "   (Cloud Run automatically scales to zero when idle - this just ensures it's configured)"
echo ""

# List of services
SERVICES=(
  "dashboard-api"
  "ishowstream"
  "chat-ingestion"
)

for service in "${SERVICES[@]}"; do
  echo "📦 Configuring service: $service"
  
  # Ensure min-instances is 0 (will scale to zero when no traffic)
  # This is usually already the default, but we'll make sure
  if gcloud run services describe $service --region $REGION --format="value(spec.template.metadata.annotations['autoscaling.knative.dev/minScale'])" 2>/dev/null | grep -q "[1-9]"; then
    echo "   ⚠️  Service has min-instances > 0, setting to 0..."
    gcloud run services update $service \
      --region $REGION \
      --min-instances 0 \
      --quiet
    echo "   ✅ $service configured to scale to zero"
  else
    echo "   ✅ $service already configured to scale to zero (min-instances=0)"
  fi
done

echo ""
echo "✅ All services configured!"
echo ""
echo "💡 Important: Cloud Run automatically scales to zero when idle (no requests for a few minutes)"
echo "   - No traffic = No instances = No compute charges"
echo "   - Services wake up automatically when requests arrive (~1-2 second cold start)"
echo ""
echo "📊 To stop API calls (Gemini API), pause the chat-ingestion service:"
echo "   ./pause-chat-ingestion.sh"
echo ""


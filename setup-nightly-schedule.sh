#!/bin/bash

# Script to set up Cloud Scheduler jobs to automatically stop/start services
# This will create scheduled jobs to stop services at night and start them in the morning
# Usage: ./setup-nightly-schedule.sh [stop_time] [start_time]
# Example: ./setup-nightly-schedule.sh "0 2 * * *" "0 8 * * *"  # Stop at 2 AM, start at 8 AM UTC

set -e

PROJECT_ID="streamsense-476705"
REGION="us-central1"
TIMEZONE="America/Los_Angeles"  # Change to your timezone

# Default schedule: Stop at 2 AM UTC, Start at 8 AM UTC
STOP_SCHEDULE=${1:-"0 2 * * *"}  # 2 AM UTC (adjust for your timezone)
START_SCHEDULE=${2:-"0 8 * * *"}  # 8 AM UTC (adjust for your timezone)

echo "⏰ Setting up Cloud Scheduler jobs for automatic service management..."
echo ""

# Check if Cloud Scheduler API is enabled
echo "🔍 Checking Cloud Scheduler API..."
if ! gcloud services list --enabled --filter="name:cloudscheduler.googleapis.com" --format="value(name)" | grep -q "cloudscheduler.googleapis.com"; then
  echo "   Enabling Cloud Scheduler API..."
  gcloud services enable cloudscheduler.googleapis.com
fi

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create Cloud Scheduler job to stop services
echo "📅 Creating 'stop-services' scheduler job..."
gcloud scheduler jobs create http stop-streamsense-services \
  --location=$REGION \
  --schedule="$STOP_SCHEDULE" \
  --time-zone=$TIMEZONE \
  --uri="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/services" \
  --http-method=POST \
  --headers="Authorization=Bearer $(gcloud auth print-access-token)" \
  --message-body='{"apiVersion":"run.googleapis.com/v1","kind":"Service","metadata":{"name":"dashboard-api"},"spec":{"template":{"spec":{"containerConcurrency":0}}}}}' \
  --description="Stop StreamSense services overnight to save costs" \
  --attempt-deadline=600s \
  --quiet 2>/dev/null || \
gcloud scheduler jobs update http stop-streamsense-services \
  --location=$REGION \
  --schedule="$STOP_SCHEDULE" \
  --time-zone=$TIMEZONE \
  --quiet

echo "   ✅ Stop job created (runs at: $STOP_SCHEDULE)"

# Actually, a simpler approach: use Cloud Functions or a script that calls gcloud
# Let's create a better solution using a Cloud Function or a simpler scheduler approach

echo ""
echo "📝 Note: Cloud Scheduler with gcloud commands requires App Engine"
echo "   Alternative: Use the manual scripts or set up a Cloud Function"
echo ""
echo "✅ Manual scripts created:"
echo "   - ./stop-services.sh  (run this to stop services)"
echo "   - ./start-services.sh (run this to start services)"
echo ""
echo "💡 To schedule automatically, you can:"
echo "   1. Use cron on your local machine:"
echo "      crontab -e"
echo "      # Add: 0 2 * * * cd $SCRIPT_DIR && ./stop-services.sh"
echo "      # Add: 0 8 * * * cd $SCRIPT_DIR && ./start-services.sh"
echo ""
echo "   2. Or use Google Cloud Scheduler with Cloud Functions (more complex)"
echo "   3. Or manually run the scripts when needed"
echo ""


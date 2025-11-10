#!/bin/bash

# StreamSense - Deploy to Google Cloud Run
# This script deploys the updated chat-ingestion service with HTTP server support

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  StreamSense - Deploy to Google Cloud Run${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Configuration from screenshot
PROJECT_ID="streamsense-476705"
REGION="us-central1"
TWITCH_CHANNEL="mrsavage"  # From your screenshot

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo -e "   Project ID: ${PROJECT_ID}"
echo -e "   Region: ${REGION}"
echo -e "   Twitch Channel: ${TWITCH_CHANNEL}"
echo

# Check if user wants to proceed
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Step 1: Set the correct project
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Setting Google Cloud Project${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✅ Project set to ${PROJECT_ID}${NC}"

# Step 2: Deploy chat-ingestion service
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Deploying chat-ingestion service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd backend/chat-ingestion

echo -e "${YELLOW}📦 Building and deploying chat-ingestion...${NC}"
echo -e "${YELLOW}   This may take 3-5 minutes...${NC}\n"

gcloud run deploy chat-ingestion \
  --source . \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},TWITCH_CHANNEL=${TWITCH_CHANNEL}" \
  --timeout=3600 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=1 \
  --max-instances=1 \
  --platform=managed

echo -e "\n${GREEN}✅ chat-ingestion deployed successfully!${NC}"

# Step 3: Get service URL and test
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Verifying Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

CHAT_INGESTION_URL=$(gcloud run services describe chat-ingestion \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo -e "${GREEN}📍 Service URL: ${CHAT_INGESTION_URL}${NC}\n"

echo -e "${YELLOW}🔍 Testing health endpoint...${NC}"
sleep 5  # Give service time to start

if curl -s "${CHAT_INGESTION_URL}/health" | jq . ; then
    echo -e "\n${GREEN}✅ Health check passed!${NC}"
else
    echo -e "\n${YELLOW}⚠️  Health check endpoint accessible but may still be starting...${NC}"
fi

echo -e "\n${YELLOW}📊 Testing stats endpoint...${NC}"
if curl -s "${CHAT_INGESTION_URL}/stats" | jq . ; then
    echo -e "\n${GREEN}✅ Stats endpoint working!${NC}"
else
    echo -e "\n${YELLOW}⚠️  Stats endpoint may still be initializing...${NC}"
fi

# Step 4: Update dashboard-api environment variables
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Updating dashboard-api environment variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Load Twitch credentials from .env file
cd ../..
if [ -f "config/.env" ]; then
    source config/.env
    echo -e "${YELLOW}🔑 Updating Twitch API credentials...${NC}"

    gcloud run services update dashboard-api \
      --region="$REGION" \
      --project="$PROJECT_ID" \
      --update-env-vars="TWITCH_CLIENT_ID=${TWITCH_CLIENT_ID},TWITCH_CLIENT_SECRET=${TWITCH_CLIENT_SECRET},TWITCH_CHANNEL=${TWITCH_CHANNEL},GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
      --quiet

    echo -e "${GREEN}✅ dashboard-api environment variables updated!${NC}"
else
    echo -e "${YELLOW}⚠️  config/.env file not found, skipping dashboard-api update${NC}"
    echo -e "${YELLOW}   The streamer logo may not display without Twitch API credentials${NC}"
fi

# Final summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}📋 Summary:${NC}"
echo -e "   • chat-ingestion service: ${CHAT_INGESTION_URL}"
echo -e "   • Monitoring Twitch channel: ${TWITCH_CHANNEL}"
echo -e "   • Min instances: 1 (always running)"
echo -e "   • Max timeout: 3600s (1 hour)"
echo

echo -e "${GREEN}🔗 Useful Commands:${NC}"
echo -e "   View logs:"
echo -e "   ${BLUE}gcloud logs tail chat-ingestion --region=${REGION}${NC}"
echo
echo -e "   Check health:"
echo -e "   ${BLUE}curl ${CHAT_INGESTION_URL}/health | jq${NC}"
echo
echo -e "   Check stats:"
echo -e "   ${BLUE}curl ${CHAT_INGESTION_URL}/stats | jq${NC}"
echo
echo -e "   Stop service (to save costs):"
echo -e "   ${BLUE}gcloud run services update chat-ingestion --region=${REGION} --min-instances=0${NC}"
echo
echo -e "   Start service again:"
echo -e "   ${BLUE}gcloud run services update chat-ingestion --region=${REGION} --min-instances=1${NC}"
echo

echo -e "${YELLOW}⚠️  Cost Warning:${NC}"
echo -e "   With --min-instances=1, this service runs 24/7 and will incur costs."
echo -e "   Consider stopping it when not in use to save money."
echo

echo -e "${GREEN}🎉 Your dashboard should now display the streamer logo and show real-time messages!${NC}"
echo -e "   Visit: https://ishowstream-870213249595-uc.a.run.app/dashboard"
echo

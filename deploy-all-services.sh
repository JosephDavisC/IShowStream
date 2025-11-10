#!/bin/bash

# StreamSense - Deploy ALL Services to Google Cloud Run
# This script deploys all 4 services: frontend, dashboard-api, chat-ingestion, and agents

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  StreamSense - Deploy ALL Services to Google Cloud Run${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Load environment variables from config/.env
if [ ! -f "config/.env" ]; then
    echo -e "${RED}❌ Error: config/.env file not found!${NC}"
    echo -e "${YELLOW}Please create config/.env with required variables.${NC}"
    exit 1
fi

source config/.env

# Configuration
PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
REGION="us-central1"

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

# Set the correct project
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Setting Google Cloud Project${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✅ Project set to ${PROJECT_ID}${NC}"

# Deploy Chat Ingestion Service
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Deploying Chat Ingestion Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📦 Building and deploying chat-ingestion...${NC}"
echo -e "${YELLOW}   This may take 3-5 minutes...${NC}\n"

gcloud run deploy chat-ingestion \
  --source ./backend/chat-ingestion \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},TWITCH_CHANNEL=${TWITCH_CHANNEL}" \
  --timeout=3600 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3 \
  --platform=managed

echo -e "\n${GREEN}✅ chat-ingestion deployed successfully!${NC}"

# Deploy Dashboard API Service
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Deploying Dashboard API Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📦 Building and deploying dashboard-api...${NC}"
echo -e "${YELLOW}   This may take 3-5 minutes...${NC}\n"

gcloud run deploy dashboard-api \
  --source ./backend/dashboard-api \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},TWITCH_CLIENT_ID=${TWITCH_CLIENT_ID},TWITCH_CLIENT_SECRET=${TWITCH_CLIENT_SECRET},TWITCH_CHANNEL=${TWITCH_CHANNEL}" \
  --timeout=300 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --platform=managed

echo -e "\n${GREEN}✅ dashboard-api deployed successfully!${NC}"

# Get Dashboard API URL
DASHBOARD_API_URL=$(gcloud run services describe dashboard-api \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo -e "${GREEN}📍 Dashboard API URL: ${DASHBOARD_API_URL}${NC}"

# Deploy Agents Service
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Deploying AI Agents Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📦 Building and deploying agents...${NC}"
echo -e "${YELLOW}   This may take 5-7 minutes...${NC}\n"

gcloud run deploy agents \
  --source ./backend/agents \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_API_KEY=${GOOGLE_API_KEY},ENABLE_BATCH=${ENABLE_BATCH},BATCH_SIZE=${BATCH_SIZE},MIN_BATCH_SIZE=${MIN_BATCH_SIZE},FALLBACK_PER_MESSAGE=${FALLBACK_PER_MESSAGE}" \
  --timeout=3600 \
  --cpu=2 \
  --memory=2Gi \
  --min-instances=0 \
  --max-instances=3 \
  --platform=managed \
  --no-cpu-throttling

echo -e "\n${GREEN}✅ agents deployed successfully!${NC}"

# Deploy Frontend Service
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Deploying Frontend Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📦 Building and deploying frontend...${NC}"
echo -e "${YELLOW}   This may take 5-7 minutes...${NC}\n"

# Build frontend with environment variables
cd frontend/dashboard

gcloud run deploy frontend \
  --source . \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --allow-unauthenticated \
  --set-env-vars="REACT_APP_FIREBASE_API_KEY=${REACT_APP_FIREBASE_API_KEY},REACT_APP_FIREBASE_AUTH_DOMAIN=${REACT_APP_FIREBASE_AUTH_DOMAIN},REACT_APP_FIREBASE_PROJECT_ID=${REACT_APP_FIREBASE_PROJECT_ID},REACT_APP_FIREBASE_STORAGE_BUCKET=${REACT_APP_FIREBASE_STORAGE_BUCKET},REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${REACT_APP_FIREBASE_MESSAGING_SENDER_ID},REACT_APP_FIREBASE_APP_ID=${REACT_APP_FIREBASE_APP_ID}" \
  --timeout=300 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=10 \
  --platform=managed

cd ../..

echo -e "\n${GREEN}✅ frontend deployed successfully!${NC}"

# Get Frontend URL
FRONTEND_URL=$(gcloud run services describe frontend \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo -e "${GREEN}📍 Frontend URL: ${FRONTEND_URL}${NC}"

# Get all service URLs
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Verifying Deployments${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

CHAT_INGESTION_URL=$(gcloud run services describe chat-ingestion \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

AGENTS_URL=$(gcloud run services describe agents \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format='value(status.url)')

echo -e "${GREEN}📍 Service URLs:${NC}"
echo -e "   Frontend:        ${FRONTEND_URL}"
echo -e "   Dashboard API:   ${DASHBOARD_API_URL}"
echo -e "   Chat Ingestion:  ${CHAT_INGESTION_URL}"
echo -e "   Agents:          ${AGENTS_URL}"
echo

# Test health endpoints
echo -e "${YELLOW}🔍 Testing health endpoints...${NC}\n"

sleep 10  # Give services time to start

echo -e "${YELLOW}Testing chat-ingestion health...${NC}"
if curl -s "${CHAT_INGESTION_URL}/health" | jq . 2>/dev/null; then
    echo -e "${GREEN}✅ Chat Ingestion health check passed!${NC}\n"
else
    echo -e "${YELLOW}⚠️  Chat Ingestion may still be starting...${NC}\n"
fi

echo -e "${YELLOW}Testing dashboard-api health...${NC}"
if curl -s "${DASHBOARD_API_URL}/health" | jq . 2>/dev/null; then
    echo -e "${GREEN}✅ Dashboard API health check passed!${NC}\n"
else
    echo -e "${YELLOW}⚠️  Dashboard API may still be starting...${NC}\n"
fi

# Final summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ALL SERVICES DEPLOYED SUCCESSFULLY!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${GREEN}🎉 StreamSense is now live on Google Cloud Run!${NC}\n"

echo -e "${GREEN}📋 Service Summary:${NC}"
echo -e "   ✅ Frontend (React):         ${FRONTEND_URL}"
echo -e "   ✅ Dashboard API (Go):       ${DASHBOARD_API_URL}"
echo -e "   ✅ Chat Ingestion (Go):      ${CHAT_INGESTION_URL}"
echo -e "   ✅ AI Agents (Python):       ${AGENTS_URL}"
echo

echo -e "${GREEN}🔗 Access Your Dashboard:${NC}"
echo -e "   ${BLUE}${FRONTEND_URL}${NC}"
echo

echo -e "${GREEN}📊 Useful Commands:${NC}"
echo -e "   View logs (chat-ingestion):"
echo -e "   ${BLUE}gcloud logs tail chat-ingestion --region=${REGION}${NC}"
echo
echo -e "   View logs (agents):"
echo -e "   ${BLUE}gcloud logs tail agents --region=${REGION}${NC}"
echo
echo -e "   View logs (dashboard-api):"
echo -e "   ${BLUE}gcloud logs tail dashboard-api --region=${REGION}${NC}"
echo
echo -e "   View logs (frontend):"
echo -e "   ${BLUE}gcloud logs tail frontend --region=${REGION}${NC}"
echo
echo -e "   List all services:"
echo -e "   ${BLUE}gcloud run services list --region=${REGION}${NC}"
echo
echo -e "   Delete all services (cleanup):"
echo -e "   ${BLUE}gcloud run services delete chat-ingestion dashboard-api agents frontend --region=${REGION}${NC}"
echo

echo -e "${YELLOW}💰 Cost Management:${NC}"
echo -e "   • All services: min-instances=0 (auto-scales to zero when idle)"
echo -e "   • Services scale down after ~15 minutes of inactivity"
echo -e "   • Cold start time: ~5-10 seconds when scaling from zero"
echo
echo -e "   ${GREEN}Use the Profile page to pause/resume monitoring and save API credits!${NC}"
echo

echo -e "${GREEN}🎮 Next Steps:${NC}"
echo -e "   1. Open the frontend URL in your browser"
echo -e "   2. Check that messages are flowing from Twitch channel: ${TWITCH_CHANNEL}"
echo -e "   3. Monitor the agent activity log for AI analysis"
echo -e "   4. View Cloud Run logs for debugging if needed"
echo

echo -e "${GREEN}✨ Deployment complete! Happy streaming! 🎮${NC}"


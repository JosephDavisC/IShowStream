#!/bin/bash

# Update Google Cloud Run services with Twitch API credentials
# This script adds the Twitch API environment variables to your Cloud Run services

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  StreamSense - Update Cloud Run Environment Variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Load environment variables from .env file
if [ -f "config/.env" ]; then
    source config/.env
    echo -e "${GREEN}✅ Loaded environment variables from config/.env${NC}"
else
    echo -e "${RED}❌ Error: config/.env file not found${NC}"
    exit 1
fi

# Check required variables
if [ -z "$TWITCH_CLIENT_ID" ] || [ -z "$TWITCH_CLIENT_SECRET" ]; then
    echo -e "${RED}❌ Error: TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not found in .env file${NC}"
    exit 1
fi

if [ -z "$GOOGLE_CLOUD_PROJECT" ]; then
    echo -e "${RED}❌ Error: GOOGLE_CLOUD_PROJECT not found in .env file${NC}"
    exit 1
fi

if [ -z "$GOOGLE_CLOUD_REGION" ]; then
    GOOGLE_CLOUD_REGION="us-central1"
    echo -e "${YELLOW}⚠️  GOOGLE_CLOUD_REGION not set, using default: ${GOOGLE_CLOUD_REGION}${NC}"
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Project: ${GOOGLE_CLOUD_PROJECT}"
echo -e "   Region: ${GOOGLE_CLOUD_REGION}"
echo -e "   Twitch Channel: ${TWITCH_CHANNEL}"
echo

# Function to update a Cloud Run service
update_service() {
    local service_name=$1
    echo -e "${BLUE}🔄 Updating ${service_name}...${NC}"

    # Check if service exists
    if gcloud run services describe "$service_name" \
        --region="$GOOGLE_CLOUD_REGION" \
        --project="$GOOGLE_CLOUD_PROJECT" \
        --format="value(name)" &>/dev/null; then

        # Update the service with environment variables
        gcloud run services update "$service_name" \
            --region="$GOOGLE_CLOUD_REGION" \
            --project="$GOOGLE_CLOUD_PROJECT" \
            --update-env-vars="\
TWITCH_CLIENT_ID=${TWITCH_CLIENT_ID},\
TWITCH_CLIENT_SECRET=${TWITCH_CLIENT_SECRET},\
TWITCH_CHANNEL=${TWITCH_CHANNEL},\
GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}" \
            --quiet

        echo -e "${GREEN}✅ ${service_name} updated successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Service ${service_name} not found, skipping...${NC}"
    fi
}

# Update dashboard-api service (needs Twitch API credentials for profile pictures)
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Updating dashboard-api service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
update_service "dashboard-api"

# Update chat-ingestion service (needs Twitch channel info)
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Updating chat-ingestion service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
update_service "chat-ingestion"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Environment variables updated successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${YELLOW}📌 Note: The services will be redeployed with the new environment variables.${NC}"
echo -e "${YELLOW}   This may take a few minutes. Please refresh your dashboard after deployment completes.${NC}"
echo

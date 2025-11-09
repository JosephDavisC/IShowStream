# Docker Deployment Guide for Google Cloud Run

This guide explains how to deploy StreamSense to Google Cloud Run using Docker.

## Prerequisites

1. Google Cloud SDK installed
2. Docker installed
3. Google Cloud project with billing enabled
4. Firestore API enabled
5. Service account with Firestore permissions

## Services

The application consists of 4 services:
1. **Frontend** - React app served by Nginx
2. **Dashboard API** - Go service (port 8082)
3. **Chat Ingestion** - Go service (port 8080)
4. **Agents** - Python service (background processing)

## Building Docker Images

### 1. Frontend

```bash
cd frontend/dashboard
docker build -t gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest .
```

### 2. Dashboard API

```bash
cd backend/dashboard-api
docker build -t gcr.io/YOUR_PROJECT_ID/streamsense-dashboard-api:latest .
```

### 3. Chat Ingestion

```bash
cd backend/chat-ingestion
docker build -t gcr.io/YOUR_PROJECT_ID/streamsense-chat-ingestion:latest .
```

### 4. Agents

```bash
cd backend/agents
docker build -t gcr.io/YOUR_PROJECT_ID/streamsense-agents:latest .
```

## Pushing to Google Container Registry

```bash
# Authenticate
gcloud auth configure-docker

# Push images
docker push gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest
docker push gcr.io/YOUR_PROJECT_ID/streamsense-dashboard-api:latest
docker push gcr.io/YOUR_PROJECT_ID/streamsense-chat-ingestion:latest
docker push gcr.io/YOUR_PROJECT_ID/streamsense-agents:latest
```

## Deploying to Cloud Run

### 1. Frontend

```bash
gcloud run deploy streamsense-frontend \
  --image gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80 \
  --set-env-vars REACT_APP_FIREBASE_API_KEY=your_key,REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
```

### 2. Dashboard API

```bash
gcloud run deploy streamsense-dashboard-api \
  --image gcr.io/YOUR_PROJECT_ID/streamsense-dashboard-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8082 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your_project,TWITCH_CLIENT_ID=your_id,TWITCH_CLIENT_SECRET=your_secret \
  --service-account your-service-account@your-project.iam.gserviceaccount.com
```

### 3. Chat Ingestion

```bash
gcloud run deploy streamsense-chat-ingestion \
  --image gcr.io/YOUR_PROJECT_ID/streamsense-chat-ingestion:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --port 8080 \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your_project,TWITCH_CHANNEL=your_channel \
  --service-account your-service-account@your-project.iam.gserviceaccount.com \
  --min-instances 1
```

### 4. Agents

```bash
gcloud run deploy streamsense-agents \
  --image gcr.io/YOUR_PROJECT_ID/streamsense-agents:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=your_project,GOOGLE_API_KEY=your_key \
  --service-account your-service-account@your-project.iam.gserviceaccount.com \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 1
```

## Environment Variables

Set the following environment variables in Cloud Run:

### Frontend
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

### Dashboard API & Chat Ingestion
- `GOOGLE_CLOUD_PROJECT`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_CHANNEL`
- `PORT`

### Agents
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_API_KEY`

## Service Account Setup

1. Create a service account in Google Cloud Console
2. Grant it the following roles:
   - Cloud Datastore User (for Firestore)
   - Service Account User
3. Use this service account when deploying to Cloud Run

## Important Notes

1. **Chat Ingestion** should have `--min-instances 1` to ensure continuous connection to Twitch
2. **Agents** should have `--min-instances 1` to ensure continuous processing
3. Update the frontend API URL to point to the Cloud Run Dashboard API URL
4. Set up CORS in Dashboard API to allow requests from the frontend domain
5. Use Secret Manager for sensitive credentials instead of environment variables

## Local Development with Docker

```bash
# Build and run all services
docker-compose up --build

# Run specific service
docker-compose up frontend
docker-compose up dashboard-api
```

## Updating Services

```bash
# Rebuild and push
docker build -t gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest .
docker push gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest

# Deploy update
gcloud run deploy streamsense-frontend \
  --image gcr.io/YOUR_PROJECT_ID/streamsense-frontend:latest \
  --platform managed \
  --region us-central1
```

## Monitoring

- View logs: `gcloud run services logs read streamsense-frontend`
- View metrics in Cloud Console
- Set up alerts for errors and high latency


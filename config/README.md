# StreamSense Configuration Guide

## Quick Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`

3. Set up Google Cloud authentication (see below)

## Required Credentials

### Google Cloud Setup
1. **GOOGLE_CLOUD_PROJECT**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Firestore API
   - Copy your project ID

2. **GOOGLE_API_KEY**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key for Gemini
   - Copy the API key

### Twitch API Setup
1. **TWITCH_CLIENT_ID & TWITCH_CLIENT_SECRET**
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Create a new application
   - Set OAuth Redirect URLs to `http://localhost`
   - Copy the Client ID and generate a Client Secret

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | Yes | - | Google Cloud Project ID for Firestore |
| `GOOGLE_API_KEY` | Yes | - | Google Gemini AI API key |
| `TWITCH_CLIENT_ID` | Yes | - | Twitch application client ID |
| `TWITCH_CLIENT_SECRET` | Yes | - | Twitch application client secret |
| `TWITCH_CHANNEL` | No | `xqc` | Twitch channel to monitor |
| `PORT` | No | `8082` | Dashboard API server port |

## Services Configuration

The `.env` file is loaded by all backend services:
- **chat-ingestion** (Go) - Port 8080
- **dashboard-api** (Go) - Port 8082 (configurable via PORT)
- **agents** (Python) - Background processing

All services load from `config/.env` relative to the project root.

## Google Cloud Authentication

The backend services require Google Cloud authentication to access Firestore. Choose one of the following methods:

### Method 1: Application Default Credentials (Recommended for Development)

1. Install the Google Cloud CLI:
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. Authenticate:
   ```bash
   gcloud auth application-default login
   ```

3. Follow the browser prompts to sign in with your Google account

### Method 2: Service Account Key (Recommended for Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "IAM & Admin" > "Service Accounts"
3. Create a new service account (or use existing)
4. Grant it "Cloud Datastore User" role (or "Firestore User")
5. Create a JSON key for the service account
6. Download the key file to your project
7. Add to your `.env` file:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
   ```

### Method 3: Emulator (For Local Development/Testing)

1. Install the Firestore emulator:
   ```bash
   gcloud components install cloud-firestore-emulator
   ```

2. Start the emulator:
   ```bash
   gcloud beta emulators firestore start --host-port=localhost:8080
   ```

3. Set environment variable before starting services:
   ```bash
   export FIRESTORE_EMULATOR_HOST=localhost:8080
   ```

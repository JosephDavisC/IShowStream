# Firebase Setup Instructions

## Step 1: Go to Firebase Console

1. Open https://console.firebase.google.com/
2. Sign in with your Google account (the same one you use for Google Cloud)
3. Select your project: **streamsense-476705** (or create it if it doesn't exist)

## Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **Get Started** (if you haven't set it up yet)
3. Go to **Sign-in method** tab
4. Enable these providers:
   - **Email/Password**: Click > Enable > Save
   - **Google**: Click > Enable > Set support email > Save

## Step 3: Get Your Firebase Web App Config

1. Click the **gear icon** ⚙️ (Project Settings) in the left sidebar
2. Scroll down to **Your apps** section
3. If you don't have a web app yet:
   - Click the **Web icon** `</>`
   - Register app with nickname: "StreamSense Dashboard"
   - Click **Register app**
4. You'll see a config like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "streamsense-476705.firebaseapp.com",
     projectId: "streamsense-476705",
     storageBucket: "streamsense-476705.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123..."
   };
   ```

## Step 4: Create .env File

1. Copy the example file:
   ```bash
   cd frontend/dashboard
   cp .env.example .env
   ```

2. Edit `.env` and fill in your Firebase values:
   ```bash
   REACT_APP_FIREBASE_API_KEY=AIzaSy...your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=streamsense-476705.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=streamsense-476705
   REACT_APP_FIREBASE_STORAGE_BUCKET=streamsense-476705.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123...
   ```

## Step 5: Restart Your Frontend

After creating/updating the `.env` file, restart your React app:
```bash
# Stop the frontend (Ctrl+C)
# Then start it again
cd frontend/dashboard
npm start
```

## Troubleshooting

- **"API key not valid"**: Make sure you copied the `apiKey` from Firebase Console, not Google Cloud Console
- **"auth/operation-not-allowed"**: Make sure you enabled Email/Password and Google sign-in methods in Firebase Authentication
- **"auth/unauthorized-domain"**: Add `localhost` to authorized domains in Firebase Console > Authentication > Settings > Authorized domains

## Quick Links

- Firebase Console: https://console.firebase.google.com/
- Your Project: https://console.firebase.google.com/project/streamsense-476705


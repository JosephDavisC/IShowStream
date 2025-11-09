# How to Get Firebase Configuration Values

## Quick Access Links

### Direct Link to Your Project Settings:
🔗 **https://console.firebase.google.com/project/streamsense-476705/settings/general**

### Direct Link to Web App Config:
🔗 **https://console.firebase.google.com/project/streamsense-476705/settings/general/web**

## Step-by-Step Instructions

### 1. Go to Firebase Console
- Open: https://console.firebase.google.com/
- Sign in with your Google account (same as Google Cloud)
- Select project: **streamsense-476705**

### 2. Navigate to Project Settings
- Click the **gear icon** ⚙️ next to "Project Overview" in the left sidebar
- OR click: **Project Settings** from the dropdown

### 3. Find Your Web App Config
- Scroll down to the **"Your apps"** section
- Look for a web app icon `</>` 
- If you see one, click on it to view the config
- If you don't see one, click the `</>` icon to add a new web app

### 4. Copy These Values

You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",  // ← Firebase API Key
  authDomain: "streamsense-476705.firebaseapp.com",
  projectId: "streamsense-476705",
  storageBucket: "streamsense-476705.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 5. Map to Environment Variables

When running `./fix-firebase.sh`, you'll be prompted for:

| Prompt | Firebase Config Value |
|--------|----------------------|
| Firebase API Key | `apiKey` |
| Firebase Auth Domain | `authDomain` |
| Firebase Project ID | `projectId` |
| Firebase Storage Bucket | `storageBucket` |
| Firebase Messaging Sender ID | `messagingSenderId` |
| Firebase App ID | `appId` |

## Common Values for Your Project

Based on your project ID `streamsense-476705`, here are the likely values:

- **Auth Domain**: `streamsense-476705.firebaseapp.com`
- **Project ID**: `streamsense-476705`
- **Storage Bucket**: `streamsense-476705.appspot.com`
- **API Key**: `AIzaSy...` (starts with "AIzaSy", get from Firebase Console)
- **Messaging Sender ID**: A numeric ID (get from Firebase Console)
- **App ID**: Format like `1:123456789:web:abc123...` (get from Firebase Console)

## Visual Guide

1. **Firebase Console Home**: https://console.firebase.google.com/
2. **Your Project**: https://console.firebase.google.com/project/streamsense-476705
3. **Project Settings**: https://console.firebase.google.com/project/streamsense-476705/settings/general
4. **Web App Config**: Scroll down to "Your apps" section

## After Getting the Config

Run the fix script:
```bash
./fix-firebase.sh
```

Then paste the values when prompted.


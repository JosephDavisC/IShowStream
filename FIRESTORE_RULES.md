# Firestore Security Rules Setup

## ⚠️ Important: Configure Firestore Security Rules

You're seeing "Missing or insufficient permissions" because Firestore security rules need to be configured to allow authenticated users to read/write their user data.

## Quick Fix: Set Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/streamsense-476705/firestore/rules)
2. Click on **Firestore Database** > **Rules** tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow read access to messages for authenticated users
    match /messages/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend services write messages
    }
    
    // Allow read access to insights for authenticated users
    match /insights/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend services write insights
    }
    
    // Allow read access to agent_activity for authenticated users
    match /agent_activity/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend services write activity
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click **Publish**

## Alternative: For Development (Less Secure)

If you want to test quickly, you can use these permissive rules (⚠️ **ONLY FOR DEVELOPMENT**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ Warning**: This allows any authenticated user to read/write all data. Only use this for local development!

## Verify Rules Are Active

After publishing, refresh your frontend and try logging in again. The "Missing or insufficient permissions" error should be resolved.

## Direct Link

Go directly to: https://console.firebase.google.com/project/streamsense-476705/firestore/rules


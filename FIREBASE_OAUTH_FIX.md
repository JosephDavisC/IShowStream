# Firebase OAuth Domain Fix

## The Issue

**Error**: `auth/unauthorized-domain`
**Message**: "The current domain is not authorized for OAuth operations"

This is a **Firebase configuration issue**, not a code issue. Firebase requires you to explicitly authorize domains that can use OAuth operations.

## Root Cause

Firebase OAuth (login/signup) only works on domains that are added to the **Authorized domains** list in Firebase Console. By default, Firebase only authorizes:
- `localhost` (for development)
- Your Firebase project's default domain
- Custom domains you've configured

Your Cloud Run domain (`ishowstream-234sus25va-uc.a.run.app`) is not in this list, so OAuth operations fail.

## Solution: Add Domain to Firebase

### Step 1: Go to Firebase Console
1. Open your browser and go to: https://console.firebase.google.com/
2. Select your project: **streamsense-476705**

### Step 2: Navigate to Authentication Settings
1. Click on **"Authentication"** in the left sidebar
2. Click on the **"Settings"** tab (at the top)
3. Scroll down to the **"Authorized domains"** section

### Step 3: Add Your Cloud Run Domain
1. Click the **"Add domain"** button
2. Enter your Cloud Run domain: `ishowstream-234sus25va-uc.a.run.app`
3. Click **"Add"**

### Step 4: Wait for Propagation
- Changes can take **2-5 minutes** to propagate
- You may need to wait up to **10 minutes** in some cases
- Clear your browser cache if it doesn't work immediately

## Your Cloud Run Domain
```
ishowstream-234sus25va-uc.a.run.app
```

## Verification

After adding the domain:
1. **Wait 5 minutes** for changes to propagate
2. **Clear browser cache** or use incognito mode
3. **Try logging in again** - OAuth should now work
4. Check browser console - the error should be gone

## Additional Domains (Optional)

You might also want to add:
- `*.run.app` (wildcard for all Cloud Run services) - **Not supported directly**
- Your custom domain (if you set one up)

**Note**: Firebase doesn't support wildcards directly. You need to add each domain individually.

## Alternative: Use Custom Domain

If you prefer a custom domain:

1. **Set up custom domain in Cloud Run**:
   ```bash
   gcloud run domain-mappings create \
     --service ishowstream \
     --domain yourdomain.com \
     --region us-central1
   ```

2. **Add custom domain to Firebase**:
   - Follow the same steps above
   - Add `yourdomain.com` instead of the Cloud Run domain

## Troubleshooting

### Issue: Still getting the error after adding domain
**Solutions**:
1. Wait 5-10 minutes for propagation
2. Clear browser cache completely
3. Try in incognito/private mode
4. Check that you added the exact domain (no https:// prefix)
5. Verify domain is in the list (refresh Firebase Console)

### Issue: Domain not showing in authorized domains list
**Solutions**:
1. Refresh the Firebase Console page
2. Check that you're in the correct project
3. Verify you have permissions to modify authentication settings
4. Try adding it again

### Issue: Works locally but not on Cloud Run
**This is expected** - `localhost` is authorized by default, but Cloud Run domain needs to be added manually.

## Code Verification

Your code is correct. The issue is purely Firebase configuration. However, you can verify your Firebase config:

**File**: `frontend/dashboard/src/firebase.js`

Make sure it has:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain.firebaseapp.com", // Should match your project
  projectId: "streamsense-476705",
  // ... other config
};
```

The `authDomain` should be your Firebase project's auth domain, not your Cloud Run domain.

## Quick Checklist

- [ ] Go to Firebase Console
- [ ] Select project: streamsense-476705
- [ ] Go to Authentication → Settings → Authorized domains
- [ ] Add domain: `ishowstream-234sus25va-uc.a.run.app`
- [ ] Wait 5 minutes for propagation
- [ ] Clear browser cache
- [ ] Test login/signup

## Summary

**This is NOT a code issue** - it's a Firebase configuration requirement. Firebase requires explicit authorization for each domain that uses OAuth. Simply add your Cloud Run domain to the authorized domains list in Firebase Console, and the issue will be resolved.

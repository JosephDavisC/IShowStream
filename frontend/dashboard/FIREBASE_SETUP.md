# Firebase Setup Checklist

## Issues Fixed ✅
1. ✅ CORS credentials - Fixed in backend
2. ✅ Update channel endpoint - Fixed to not require credentials

## Still Need to Configure:

### 1. Firestore Security Rules ⚠️ REQUIRED

**You MUST configure Firestore security rules to allow authenticated users to access their data.**

📖 See: `FIRESTORE_RULES.md` in project root for detailed instructions

**Quick Steps:**
1. Go to: https://console.firebase.google.com/project/streamsense-476705/firestore/rules
2. Copy the rules from `FIRESTORE_RULES.md`
3. Click **Publish**

**Without this, you'll get "Missing or insufficient permissions" errors.**

### 2. Firebase Authorized Domains (For Google Sign-In)

The Cross-Origin-Opener-Policy errors are usually harmless, but to fully fix:

1. Go to: https://console.firebase.google.com/project/streamsense-476705/authentication/settings
2. Scroll to **Authorized domains**
3. Make sure `localhost` is in the list (it should be by default)
4. If not, click **Add domain** and add `localhost`

### 3. Restart Backend After Changes

After fixing Firestore rules, you need to restart the backend:

```bash
# Stop all services
./stop-all.sh

# Restart everything
./start-all.sh
```

Or if just restarting backend:
```bash
# Kill the dashboard-api process
kill $(cat .pids/dashboard-api.pid)

# Restart it
cd backend/dashboard-api
go run main.go &
```


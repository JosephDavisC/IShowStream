# Quick Fix Checklist for Cloud Run Issues

## ✅ Immediate Actions Required

### 1. Add Firebase OAuth Domain (5 minutes)
- [ ] Go to Firebase Console → Authentication → Settings → Authorized domains
- [ ] Add: `ishowstream-234sus25va-uc.a.run.app`
- [ ] Wait 5 minutes for propagation

### 2. Set Environment Variables in Cloud Run (10 minutes)

#### Frontend Service:
```bash
gcloud run services update ishowstream \
  --region us-central1 \
  --update-env-vars REACT_APP_API_URL=https://YOUR-DASHBOARD-API-URL.run.app,REACT_APP_WS_URL=wss://YOUR-DASHBOARD-API-URL.run.app/ws
```

#### Backend API Service:
```bash
gcloud run services update dashboard-api \
  --region us-central1 \
  --update-env-vars CORS_ALLOW_ALL=true
```

### 3. Rebuild and Redeploy Frontend (15 minutes)

```bash
# Build with new entrypoint script
cd frontend/dashboard
gcloud builds submit --tag gcr.io/streamsense-476705/ishowstream-frontend

# Deploy
gcloud run deploy ishowstream \
  --image gcr.io/streamsense-476705/ishowstream-frontend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars REACT_APP_API_URL=https://YOUR-API-URL,REACT_APP_WS_URL=wss://YOUR-API-URL/ws
```

### 4. Verify Configuration (5 minutes)

1. Open your Cloud Run frontend URL
2. Open browser DevTools → Console
3. Look for: `🔧 Dashboard API Configuration:`
4. Verify API_URL is NOT localhost
5. Check for WebSocket connection status

## 🔍 Troubleshooting Stats/Insights Not Showing

### Check 1: API Connection
- [ ] Open browser DevTools → Network tab
- [ ] Look for `/api/stats` and `/api/insights/latest` requests
- [ ] Verify they return 200 status (not 404 or CORS errors)

### Check 2: Messages in Firestore
- [ ] Verify chat-ingestion service is running
- [ ] Check Firestore for messages in the `messages` collection
- [ ] Verify messages have `channel` field matching your channel name

### Check 3: Agent Analysis
- [ ] Verify agents service is running
- [ ] Check Firestore messages have `agent_analysis` field
- [ ] Verify `agent_analysis.spam` and `agent_analysis.priority` exist

### Check 4: Channel Filtering
- [ ] Verify channel name in Profile matches Firestore `channel` field
- [ ] Channel names are case-insensitive but must match exactly
- [ ] Check browser console for channel parameter in API requests

## 🚨 Common Errors and Fixes

### Error: "WebSocket connection to 'ws://localhost:8082/ws' failed"
**Fix**: Environment variables not set. Follow step 2 above.

### Error: "OAuth domain not authorized"
**Fix**: Add domain to Firebase. Follow step 1 above.

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Fix**: Set `CORS_ALLOW_ALL=true` in dashboard-api service.

### Error: "Stats showing 0 messages"
**Possible causes**:
1. No messages in Firestore for the channel
2. Messages don't have `agent_analysis` field
3. Channel name mismatch
4. API connection failing (check Network tab)

## 📝 Verification Steps

After fixes, verify:
- [ ] Login works (no OAuth errors)
- [ ] Signup works (no OAuth errors)
- [ ] Dashboard loads without errors
- [ ] WebSocket connects (check console for "✅ WebSocket connected")
- [ ] Stats show data (if messages exist)
- [ ] Insights show data (if insights exist)
- [ ] Recent messages load (if messages exist)

## 🆘 Still Not Working?

1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read ishowstream --region us-central1
   gcloud run services logs read dashboard-api --region us-central1
   ```

2. Check browser console for detailed error messages

3. Verify all services are deployed and running:
   ```bash
   gcloud run services list --region us-central1
   ```

4. Check Firestore data:
   - Open Firebase Console → Firestore
   - Check `messages` collection has documents
   - Verify documents have required fields


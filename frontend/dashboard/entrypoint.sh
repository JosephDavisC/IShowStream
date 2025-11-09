#!/bin/sh

# Generate runtime config.js file from environment variables
# This allows configuration to be set at container startup time

cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration injected at container startup
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-}",
  REACT_APP_WS_URL: "${REACT_APP_WS_URL:-}",
  REACT_APP_FIREBASE_API_KEY: "${REACT_APP_FIREBASE_API_KEY:-}",
  REACT_APP_FIREBASE_AUTH_DOMAIN: "${REACT_APP_FIREBASE_AUTH_DOMAIN:-}",
  REACT_APP_FIREBASE_PROJECT_ID: "${REACT_APP_FIREBASE_PROJECT_ID:-}",
  REACT_APP_FIREBASE_STORAGE_BUCKET: "${REACT_APP_FIREBASE_STORAGE_BUCKET:-}",
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: "${REACT_APP_FIREBASE_MESSAGING_SENDER_ID:-}",
  REACT_APP_FIREBASE_APP_ID: "${REACT_APP_FIREBASE_APP_ID:-}",
};
EOF

echo "✅ Runtime configuration injected:"
echo "   API_URL: ${REACT_APP_API_URL:-<not set - using auto-detection>}"
echo "   WS_URL: ${REACT_APP_WS_URL:-<not set - using auto-detection>}"
echo "   FIREBASE_API_KEY: ${REACT_APP_FIREBASE_API_KEY:-<not set>}"
echo "   FIREBASE_AUTH_DOMAIN: ${REACT_APP_FIREBASE_AUTH_DOMAIN:-<not set>}"

# Start nginx
exec nginx -g "daemon off;"

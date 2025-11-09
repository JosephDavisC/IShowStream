#!/bin/sh

# Generate runtime config.js file from environment variables
# This allows configuration to be set at container startup time

cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration injected at container startup
window.__RUNTIME_CONFIG__ = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-}",
  REACT_APP_WS_URL: "${REACT_APP_WS_URL:-}",
};
EOF

echo "✅ Runtime configuration injected:"
echo "   API_URL: ${REACT_APP_API_URL:-<not set - using auto-detection>}"
echo "   WS_URL: ${REACT_APP_WS_URL:-<not set - using auto-detection>}"

# Start nginx
exec nginx -g "daemon off;"

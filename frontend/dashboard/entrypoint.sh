#!/bin/sh

# Set default PORT if not provided (Cloud Run sets this)
PORT=${PORT:-8080}

# Generate nginx config with dynamic port
cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

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
echo "   PORT: ${PORT}"
echo "   API_URL: ${REACT_APP_API_URL:-<not set - using auto-detection>}"
echo "   WS_URL: ${REACT_APP_WS_URL:-<not set - using auto-detection>}"
echo "   FIREBASE_API_KEY: ${REACT_APP_FIREBASE_API_KEY:-<not set>}"
echo "   FIREBASE_AUTH_DOMAIN: ${REACT_APP_FIREBASE_AUTH_DOMAIN:-<not set>}"

# Start nginx
exec nginx -g "daemon off;"

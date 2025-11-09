// Configuration utility
// Uses runtime config from window.__RUNTIME_CONFIG__ if available
// Falls back to environment variables (set at build time)
// Falls back to auto-detection based on current domain

function getApiUrl() {
  // 1. Check runtime config (injected at runtime via config.js)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.REACT_APP_API_URL) {
    const url = window.__RUNTIME_CONFIG__.REACT_APP_API_URL.trim();
    if (url) {
      return url;
    }
  }

  // 2. Check build-time environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 3. Auto-detect based on current domain (for Cloud Run)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If we're on a Cloud Run domain, try to construct API URL
    if (hostname.includes('.run.app') || hostname.includes('.a.run.app')) {
      // Common Cloud Run pattern: frontend service name -> API service name
      // Try different patterns to find the API service
      const patterns = [
        hostname.replace('ishowstream', 'dashboard-api'), // ishowstream-xxx -> dashboard-api-xxx
        hostname.replace(/ishowstream-[\w-]+/, 'dashboard-api-234sus25va'), // Use known API service ID if available
      ];
      
      // Log warning with suggestions
      console.error('⚠️ API URL not configured via environment variable!');
      console.error('   Current hostname:', hostname);
      console.error('   Please set REACT_APP_API_URL in Cloud Run service environment variables.');
      console.error('   Suggested API URLs:');
      patterns.forEach((pattern, i) => {
        console.error(`   ${i + 1}. ${protocol}//${pattern}`);
      });
      
      // Return first pattern as fallback (might not work)
      return `${protocol}//${patterns[0]}`;
    }
  }

  // 4. Fallback to localhost for development
  return 'http://localhost:8082';
}

function getWsUrl() {
  // 1. Check runtime config (injected at runtime via config.js)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.REACT_APP_WS_URL) {
    const url = window.__RUNTIME_CONFIG__.REACT_APP_WS_URL.trim();
    if (url) {
      return url;
    }
  }

  // 2. Check build-time environment variable
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // 3. Construct from API URL
  const apiUrl = getApiUrl();
  if (apiUrl.startsWith('https')) {
    return apiUrl.replace('https', 'wss') + '/ws';
  } else if (apiUrl.startsWith('http')) {
    return apiUrl.replace('http', 'ws') + '/ws';
  } else {
    // Fallback
    return 'ws://localhost:8082/ws';
  }
}

export const config = {
  API_URL: getApiUrl(),
  WS_URL: getWsUrl(),
};

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    API_URL: config.API_URL,
    WS_URL: config.WS_URL,
    source: window.__RUNTIME_CONFIG__ ? 'runtime' : process.env.REACT_APP_API_URL ? 'build-time' : 'auto-detect'
  });
}


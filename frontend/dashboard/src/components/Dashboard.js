import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';
import Stats from './Stats';
import RecentMessages from './RecentMessages';
import AIInsights from './AIInsights';
import AgentActivityLog from './AgentActivityLog';

function Dashboard() {
  const [stats, setStats] = useState({});
  const [recentMessages, setRecentMessages] = useState([]);
  const [insights, setInsights] = useState(null);
  const [streamerInfo, setStreamerInfo] = useState(null);
  const [agentActivities, setAgentActivities] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const { user } = useAuth();

  // Determine API URL - auto-detect for Cloud Run or use environment variable
  const getApiUrl = () => {
    // Check runtime config (injected by entrypoint.sh if available)
    if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.REACT_APP_API_URL) {
      const url = window.__RUNTIME_CONFIG__.REACT_APP_API_URL.trim();
      if (url) {
        console.log('✅ Using API URL from runtime config:', url);
        return url;
      }
    }
    // Check environment variable (set at build time)
    if (process.env.REACT_APP_API_URL) {
      console.log('✅ Using API URL from build-time env:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
    // Auto-detect for Cloud Run - try to find dashboard-api service
    if (typeof window !== 'undefined' && window.location.hostname.includes('.run.app')) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      // Extract service ID from hostname (format: service-xxxxx-uc.a.run.app)
      const match = hostname.match(/^([^-]+)-([^-]+)-([^.]+)\.(.+)$/);
      if (match) {
        const [, serviceName, serviceId, region, domain] = match;
        // Construct dashboard-api URL with same service ID and region
        const apiHostname = `dashboard-api-${serviceId}-${region}.${domain}`;
        const apiUrl = `${protocol}//${apiHostname}`;
        console.log('🔍 Auto-detected API URL from Cloud Run pattern:', apiUrl);
        console.warn('⚠️ API URL not configured. Using auto-detection which may not work correctly.');
        console.warn('   Please set REACT_APP_API_URL environment variable in Cloud Run service.');
        return apiUrl;
      }
      // Fallback: try simple replacement
      const apiHostname = hostname.replace('ishowstream', 'dashboard-api');
      console.log('🔍 Auto-detected API URL (fallback):', `${protocol}//${apiHostname}`);
      return `${protocol}//${apiHostname}`;
    }
    // Fallback to localhost for development
    console.log('🌐 Using localhost API URL (development mode)');
    return 'http://localhost:8082';
  };

  const getWsUrl = () => {
    // Check runtime config
    if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.REACT_APP_WS_URL) {
      const url = window.__RUNTIME_CONFIG__.REACT_APP_WS_URL.trim();
      if (url) return url;
    }
    // Check environment variable
    if (process.env.REACT_APP_WS_URL) {
      return process.env.REACT_APP_WS_URL;
    }
    // Construct from API URL
    const apiUrl = getApiUrl();
    if (apiUrl.startsWith('https')) {
      return apiUrl.replace('https', 'wss') + '/ws';
    }
    return apiUrl.replace('http', 'ws') + '/ws';
  };

  const API_URL = getApiUrl();
  const WS_URL = getWsUrl();
  
  // Log configuration for debugging
  useEffect(() => {
    console.log('🔧 Dashboard API Configuration:', { API_URL, WS_URL, hostname: window.location.hostname });
  }, [API_URL, WS_URL]);

  // Fetch initial data from API
  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch recent messages
      const recentRes = await fetch(`${API_URL}/api/messages/recent`);
      const recentData = await recentRes.json();
      setRecentMessages(recentData ? recentData.slice(0, 20) : []); // Last 20

      // Fetch AI insights
      const insightsRes = await fetch(`${API_URL}/api/insights/latest`);
      const insightsData = await insightsRes.json();
      setInsights(insightsData);

      // Fetch streamer info
      const streamerRes = await fetch(`${API_URL}/api/streamer`);
      const streamerData = await streamerRes.json();
      setStreamerInfo(streamerData);

      // Fetch agent activity
      const activityRes = await fetch(`${API_URL}/api/agent-activity`);
      const activityData = await activityRes.json();
      setAgentActivities(activityData || []);

      setIsLive(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLive(false);
    }
  };

  // Fetch initial data on mount
  useEffect(() => {
    fetchData();
    // Poll less frequently for stats, insights, etc (every 10 seconds)
    // Messages are now real-time via WebSocket
    const interval = setInterval(() => {
      // Only fetch non-realtime data (stats, insights, streamer info)
      const fetchNonRealtime = async () => {
        try {
          const statsRes = await fetch(`${API_URL}/api/stats`);
          const statsData = await statsRes.json();
          setStats(statsData);

          const insightsRes = await fetch(`${API_URL}/api/insights/latest`);
          const insightsData = await insightsRes.json();
          setInsights(insightsData);

          const streamerRes = await fetch(`${API_URL}/api/streamer`);
          const streamerData = await streamerRes.json();
          setStreamerInfo(streamerData);
        } catch (error) {
          console.error('Error fetching non-realtime data:', error);
        }
      };
      fetchNonRealtime();
    }, 10000); // Poll every 10 seconds for non-realtime data
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for real-time agent activity
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setIsLive(true);
    };

    ws.onmessage = (event) => {
      try {
        // Try parsing as single JSON first
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (singleParseError) {
          // If single parse fails, try splitting by newlines (multiple messages)
          const messages = event.data.split('\n').filter(msg => msg.trim());
          if (messages.length > 0) {
            // Try to parse the first message
            data = JSON.parse(messages[0].trim());
          } else {
            throw singleParseError;
          }
        }

        if (data.type === 'agent_activity') {
          // Add new activity to the top of the list
          setAgentActivities(prev => [data.activity, ...prev].slice(0, 50));
          console.log('📡 Received agent activity:', data.activity);
        } else if (data.type === 'new_message') {
          // Add new message in real-time
          setRecentMessages(prev => {
            // Check if message already exists (prevent duplicates)
            const exists = prev.some(msg => msg.id === data.message.id);
            if (exists) return prev;
            // Add to top and keep last 50
            return [data.message, ...prev].slice(0, 50);
          });
        }
      } catch (error) {
        // Only log if it's not a common parsing issue
        if (!error.message.includes('JSON')) {
          console.error('Error processing WebSocket message:', error);
        }
        // Silently ignore JSON parsing errors to prevent console spam
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsLive(false);
    };

    ws.onclose = () => {
      console.log('⚠️  WebSocket disconnected');
      setIsLive(false);

      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        console.log('🔄 Reconnecting WebSocket...');
      }, 3000);
    };

    // Cleanup WebSocket on unmount
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header app-content">
        <div className="dashboard-header-content">
          {streamerInfo && (
            <div className="streamer-info-centered">
              {streamerInfo.avatar_url && (
                <img 
                  src={streamerInfo.avatar_url} 
                  alt={streamerInfo.display_name || streamerInfo.channel}
                  className="streamer-avatar"
                />
              )}
              <h1 className="dashboard-title">
                {streamerInfo.display_name || streamerInfo.channel}
              </h1>
            </div>
          )}
          {isLive && (
            <div className="live-indicator">
              <span className="live-dot"></span>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      <main className="dashboard-content">
        {/* Main Content Area */}
        <div className="main-content-wrapper app-content">
        {/* Stats Row */}
        <section className="section-stats">
          <Stats stats={stats} />
        </section>

        {/* AI Insights - Main Feature (Large) */}
        <section className="section-insights-main">
          <AIInsights insights={insights} />
        </section>

        {/* Recent Messages Section */}
        <section className="section-messages">
          <RecentMessages messages={recentMessages} />
        </section>

        {/* Agent Activity Log Section */}
        <section className="section-agent-activity">
          <AgentActivityLog activities={agentActivities} />
        </section>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;


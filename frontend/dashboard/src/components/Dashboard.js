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

  const API_URL = 'http://localhost:8082';
  const WS_URL = 'ws://localhost:8082/ws';

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


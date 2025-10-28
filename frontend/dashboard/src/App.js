import React, { useState, useEffect } from 'react';
import './App.css';
import PriorityMessages from './components/PriorityMessages';
import Stats from './components/Stats';
import RecentMessages from './components/RecentMessages';
import AIInsights from './components/AIInsights';
import AgentActivityLog from './components/AgentActivityLog';

function App() {
  const [stats, setStats] = useState({});
  const [priorityMessages, setPriorityMessages] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [insights, setInsights] = useState(null);
  const [streamerInfo, setStreamerInfo] = useState(null);
  const [agentActivities, setAgentActivities] = useState([]);
  const [isLive, setIsLive] = useState(false);

  const API_URL = 'http://localhost:8082';
  const WS_URL = 'ws://localhost:8082/ws';

  // Fetch initial data from API
  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/stats`);
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch priority messages
      const priorityRes = await fetch(`${API_URL}/api/messages/priority`);
      const priorityData = await priorityRes.json();
      setPriorityMessages(priorityData ? priorityData.slice(0, 5) : []); // Top 5

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

  // Fetch data on mount and poll every 5 seconds for non-realtime data
  useEffect(() => {
    fetchData();
    // Poll less frequently since WebSocket handles real-time updates
    const interval = setInterval(fetchData, 5000);
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
        const data = JSON.parse(event.data);

        if (data.type === 'agent_activity') {
          // Add new activity to the top of the list
          setAgentActivities(prev => [data.activity, ...prev].slice(0, 50));
          console.log('📡 Received agent activity:', data.activity);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
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
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" style={{verticalAlign: 'middle', marginRight: '10px'}}>
              <path d="M4.265 3.3L5.6 2l17.7 17.7-1.3 1.3L17.5 16.5c-.6.5-1.3.9-2.1 1.1-.5.1-1.1.2-1.6.2-1.2 0-2.4-.4-3.3-1.1l-2.1 2.1c-.6.6-1.4.9-2.2.9-.8 0-1.6-.3-2.2-.9L2 17l2-2c-.7-.9-1.1-2.1-1.1-3.3 0-.5.1-1.1.2-1.6.2-.8.6-1.5 1.1-2.1L4.3 8 6 6.3l-1.7-3z" fill="#9147ff"/>
              <path d="M21 2H8l-2 2h13v11h2V4c0-1.1-.9-2-2-2zm-6 4h-2v4h2V6zm4 0h-2v4h2V6z" fill="#9147ff"/>
            </svg>
            StreamSense
          </h1>
        </div>
        <div className="header-center">
          {streamerInfo && (
            <div className="streamer-profile">
              <div className="streamer-avatar">
                <img
                  src={streamerInfo.avatar_url}
                  alt={streamerInfo.display_name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="avatar-fallback">🎮</div>';
                  }}
                />
              </div>
              <div className="streamer-details">
                <div className="streamer-name">{streamerInfo.display_name}</div>
                <div className="streamer-platform">{streamerInfo.platform}</div>
              </div>
            </div>
          )}
        </div>
        <div className="header-right">
          <div className="status">
            <div className={`status-indicator ${isLive ? 'live' : 'offline'}`}></div>
            <span>{isLive ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Stats Row */}
        <section className="section-stats">
          <Stats stats={stats} />
        </section>

        {/* AI Insights - Main Feature (Large) */}
        <section className="section-insights-main">
          <AIInsights insights={insights} />
        </section>

        {/* Two Column Layout: Chat + Priority */}
        <div className="content-grid">
          {/* Left: Recent Messages */}
          <div className="chat-section-wrapper">
            <RecentMessages messages={recentMessages} />
          </div>

          {/* Right: High Priority Messages */}
          <div className="priority-section-wrapper">
            <PriorityMessages messages={priorityMessages} />
          </div>
        </div>

        {/* Agent Activity Log Section */}
        <section className="section-agent-activity">
          <AgentActivityLog activities={agentActivities} />
        </section>
      </main>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import './App.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import PriorityMessages from './components/PriorityMessages';
import Stats from './components/Stats';
import RecentMessages from './components/RecentMessages';
import AIInsights from './components/AIInsights';

function App() {
  const [stats, setStats] = useState({});
  const [priorityMessages, setPriorityMessages] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [insights, setInsights] = useState(null);
  const [streamerInfo, setStreamerInfo] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isHorizontalLayout, setIsHorizontalLayout] = useState(true);

  const API_URL = 'http://localhost:8082';

  // Fetch data from API
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

      setIsLive(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLive(false);
    }
  };

  // Fetch data on mount and every 3 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`App ${isHorizontalLayout ? 'layout-horizontal' : 'layout-vertical'}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>🎮 StreamSense</h1>
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
          <button
            className="layout-toggle-btn"
            onClick={() => setIsHorizontalLayout(!isHorizontalLayout)}
            title={isHorizontalLayout ? "Switch to Vertical Layout" : "Switch to Horizontal Layout"}
          >
            {isHorizontalLayout ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            <span>{isHorizontalLayout ? 'Vertical' : 'Horizontal'}</span>
          </button>
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

        {/* Main Content Layout */}
        <div className={`main-layout ${isHorizontalLayout ? 'horizontal' : 'vertical'}`}>
          {/* Left/Top Section - AI Insights and Priority */}
          <div className="insights-section-wrapper">
            {/* AI Insights Section */}
            <section className="section-insights">
              <AIInsights insights={insights} />
            </section>

            {/* Priority Messages - Only in horizontal mode */}
            {isHorizontalLayout && (
              <section className="section-priority">
                <PriorityMessages messages={priorityMessages} />
              </section>
            )}
          </div>

          {/* Right/Bottom Section - Chat */}
          <div className="chat-section-wrapper">
            <RecentMessages messages={recentMessages} />
          </div>
        </div>

        {/* Priority Messages - Only in vertical mode */}
        {!isHorizontalLayout && (
          <section className="section-priority-vertical">
            <PriorityMessages messages={priorityMessages} />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
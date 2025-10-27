import React, { useState, useEffect } from 'react';
import './App.css';
import PriorityMessages from './components/PriorityMessages';
import Stats from './components/Stats';
import RecentMessages from './components/RecentMessages';

function App() {
  const [stats, setStats] = useState({});
  const [priorityMessages, setPriorityMessages] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [isLive, setIsLive] = useState(false);

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
    <div className="App">
      <header className="app-header">
        <h1>🎮 StreamSense Dashboard</h1>
        <div className="status">
          <div className={`status-indicator ${isLive ? 'live' : 'offline'}`}></div>
          <span>{isLive ? '🔴 LIVE' : '⚫ OFFLINE'}</span>
        </div>
      </header>

      <main className="dashboard-content">
        {/* Stats Row */}
        <section className="section-stats">
          <Stats stats={stats} />
        </section>

        {/* Two Column Layout */}
        <div className="two-column">
          {/* Priority Messages */}
          <section className="section-priority">
            <PriorityMessages messages={priorityMessages} />
          </section>

          {/* Recent Messages */}
          <section className="section-recent">
            <RecentMessages messages={recentMessages} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
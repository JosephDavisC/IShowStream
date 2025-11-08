import React from 'react';
import { Activity, MessageSquare } from 'lucide-react';

function Stats({ stats }) {
  const statItems = [
    {
      icon: <MessageSquare />,
      label: 'Total Messages',
      value: stats.total_messages || 0,
      color: '#3b82f6'
    },
    {
      icon: <Activity />,
      label: 'Messages/Min',
      value: (stats.messages_per_min || 0).toFixed(1),
      color: '#10b981'
    }
  ];

  return (
    <div className="stats-grid">
      {statItems.map((item, index) => (
        <div key={index} className="stat-card" style={{ borderLeftColor: item.color }}>
          <div className="stat-icon" style={{ color: item.color }}>
            {item.icon}
          </div>
          <div className="stat-content">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Stats;
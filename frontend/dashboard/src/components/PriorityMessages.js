import React from 'react';
import { AlertCircle } from 'lucide-react';

function PriorityMessages({ messages }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="priority-empty">
        <p>No high priority messages</p>
      </div>
    );
  }

  return (
    <div className="priority-messages">
      <h2>⚡ Priority Messages</h2>
      <div className="message-list">
        {messages.map((msg, index) => {
          const priority = msg.agent_analysis?.priority?.priority || 0;
          const category = msg.agent_analysis?.priority?.category || 'unknown';
          
          return (
            <div key={msg.id || index} className={`message-card priority-${Math.floor(priority / 3)}`}>
              <div className="message-header">
                <span className="username">{msg.username}</span>
                <span className="priority-badge">Priority: {priority}/10</span>
              </div>
              <div className="message-content">{msg.message}</div>
              <div className="message-meta">
                <span className="category">{category}</span>
                {msg.is_sub && <span className="badge sub">SUB</span>}
                {msg.is_mod && <span className="badge mod">MOD</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PriorityMessages;